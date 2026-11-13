import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractJSONFromText(text: string | undefined): unknown {
  if (!text) return null;
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const firstBracket = candidate.indexOf('[');
    const firstBrace = candidate.indexOf('{');
    const start =
      firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)
        ? firstBracket
        : firstBrace;
    if (start === -1) return null;
    const endChar = candidate[start] === '[' ? ']' : '}';
    const end = candidate.lastIndexOf(endChar);
    if (end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function extractGroundingSources(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
}): Array<{ title: string; uri: string }> {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: Array<{ title: string; uri: string }> = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title || uri;
    if (uri && title && !seen.has(uri)) {
      seen.add(uri);
      sources.push({ title, uri });
    }
  }
  return sources.slice(0, 8);
}

function isLikelyImageUrl(url: string | undefined | null): url is string {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('placeholder') || lower.includes('example.com') || lower.endsWith('.svg')) {
    return false;
  }
  return true;
}

async function fetchOgImageFromUrl(pageUrl: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(pageUrl)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const resp = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HearthTableRecipeFetcher/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = (await resp.text()).slice(0, 120000);

    // Try og:image or twitter:image meta tags
    const metaMatches = [
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i),
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i),
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i),
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i),
    ];

    for (const m of metaMatches) {
      if (m?.[1]) {
        const resolved = new URL(m[1], resp.url || pageUrl).toString();
        if (isLikelyImageUrl(resolved)) return resolved;
      }
    }

    // Try JSON-LD Recipe image field
    const ldMatch = html.match(/"image"\s*:\s*(?:"(https?:\/\/[^"]+)"|\[\s*"(https?:\/\/[^"]+)")/i);
    const ldUrl = ldMatch?.[1] || ldMatch?.[2];
    if (isLikelyImageUrl(ldUrl)) return ldUrl;

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichRecipesWithGroundedImages(
  recipes: Array<Record<string, unknown>>,
  sources: Array<{ title: string; uri: string }>
): Promise<Array<Record<string, unknown>>> {
  // Fetch og:image from up to 4 grounded source URLs in parallel
  const sourceImagePairs = await Promise.all(
    sources.slice(0, 4).map(async (src) => {
      const img = await fetchOgImageFromUrl(src.uri);
      return { title: src.title.toLowerCase(), uri: src.uri, img };
    })
  );

  const availableImages = sourceImagePairs.filter((p): p is { title: string; uri: string; img: string } => !!p.img);

  return recipes.map((recipe, idx) => {
    const rawImg = typeof recipe.imageUrl === 'string' ? recipe.imageUrl : null;
    if (isLikelyImageUrl(rawImg)) {
      return { ...recipe, imageUrl: rawImg };
    }

    const titleWords = String(recipe.title || '')
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const matchedByTitle = availableImages.find((src) =>
      titleWords.some((w) => src.title.includes(w))
    );

    const matched = matchedByTitle || availableImages[idx] || null;

    return {
      ...recipe,
      imageUrl: matched ? matched.img : null,
      sourceUrl:
        typeof recipe.sourceUrl === 'string' && isLikelyImageUrl(recipe.sourceUrl)
          ? recipe.sourceUrl
          : matched?.uri || sources[idx]?.uri || undefined,
    };
  });
}

const RECIPE_JSON_SCHEMA_GUIDE = `
Return ONLY valid JSON (no explanatory prose outside JSON) matching this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "1-2 appetizing sentences describing flavor and practicality.",
      "cuisine": "One of: West African | East Asian | South Asian | Mediterranean | Latin American | Middle Eastern | Caribbean | European | North American | Southeast Asian",
      "mealTypes": ["dinner"],
      "prepMinutes": 15,
      "cookMinutes": 25,
      "defaultServings": 4,
      "budgetTier": "thrifty | moderate | special",
      "equipment": ["stovetop", "one-pot"],
      "dietaryTags": ["gluten-free", "dairy-free"],
      "nutritionGoals": ["high-protein", "balanced"],
      "palate": "familiar | balanced | adventurous",
      "kidFriendly": true,
      "calories": 480,
      "proteinGrams": 28,
      "carbsGrams": 46,
      "fatGrams": 16,
      "fiberGrams": 7,
      "imageUrl": "Direct HTTPS image URL from the found online recipe source if explicitly available in search results, otherwise null",
      "sourceUrl": "Source webpage URL from search results if available, otherwise null",
      "ingredients": [
        {
          "name": "chicken thighs",
          "quantity": 1.5,
          "unit": "lb",
          "aisle": "Meat & Seafood",
          "substitutes": ["firm tofu", "chickpeas"]
        }
      ],
      "instructions": [
        "Clear step 1...",
        "Clear step 2..."
      ],
      "regionalNotes": "Optional tip for local ingredient swaps if traveling."
    }
  ]
}
NEVER invent or guess an imageUrl. Only include imageUrl if a real image URL appeared in the search source; otherwise set imageUrl to null.
Allowed equipment values: "stovetop", "one-pot", "oven", "air-fryer", "slow-cooker", "no-cook", "blender".
Allowed aisle values: "Produce", "Meat & Seafood", "Dairy & Eggs", "Grains & Bakery", "Canned & Dry Goods", "Spices & Oils", "Frozen & Other".
Allowed mealTypes values: "breakfast", "lunch", "dinner".
Allowed dietaryTags values: "vegetarian", "vegan", "halal", "kosher", "gluten-free", "dairy-free", "nut-free", "pescatarian".
Allowed nutritionGoals values: "high-protein", "balanced", "low-carb", "heart-healthy", "high-fiber", "calorie-conscious", "kid-friendly".
`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.post('/api/recipes/search-online', async (req, res) => {
    try {
      const {
        query = '',
        cuisine = '',
        dietary = [],
        nutritionGoals = [],
        equipment = [],
        budget = '',
        palate = '',
        regionName = '',
        localStaples = [],
        pantryItems = [],
        prioritizePantry = false,
        excludeIngredients = [],
      } = req.body ?? {};

      const ai = getAIClient();
      const constraints = [
        query ? `Search query: "${query}"` : 'Find popular everyday family meal recipes',
        cuisine ? `Preferred cuisine/culture: ${cuisine}` : '',
        dietary.length ? `Mandatory dietary restrictions: ${dietary.join(', ')}` : '',
        nutritionGoals.length ? `Nutritional goals: ${nutritionGoals.join(', ')}` : '',
        equipment.length ? `Only use available kitchen equipment: ${equipment.join(', ')}` : '',
        budget ? `Budget level (purse): ${budget}` : '',
        palate ? `Palate comfort level: ${palate}` : '',
        regionName ? `User is currently shopping/cooking in region: ${regionName} (available local staples: ${localStaples.join(', ')})` : '',
        pantryItems.length
          ? prioritizePantry
            ? `STRICTLY PRIORITIZE recipes that primarily use these ingredients already on hand in the user's pantry to minimize new grocery purchases: ${pantryItems.slice(0, 25).join(', ')}`
            : `Try to utilize some of these pantry ingredients: ${pantryItems.slice(0, 15).join(', ')}`
          : '',
        excludeIngredients.length ? `STRICTLY EXCLUDE these ingredients: ${excludeIngredients.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const prompt = `Search online for 4 authentic, practical, real-world recipes matching these household needs:
${constraints}

Ensure ingredient quantities are numeric (e.g., 1.5, 2, 0.5) and units are clear. Include practical regional ingredient substitutes when helpful.
${RECIPE_JSON_SCHEMA_GUIDE}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a practical global culinary assistant helping families, parents, and everyday cooks find authentic, budget-aware, culturally diverse recipes online. Always return clean JSON matching the requested schema, and never fabricate image URLs.',
        },
      });

      const parsed = extractJSONFromText(response.text) as { recipes?: unknown[] } | unknown[] | null;
      const rawRecipes = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { recipes?: unknown[] }).recipes)
          ? (parsed as { recipes: unknown[] }).recipes
          : [];

      const sources = extractGroundingSources(response);

      if (!rawRecipes.length) {
        return res.status(422).json({
          error: 'Could not extract structured recipes from search results. Try a more specific dish or cuisine.',
          sources,
        });
      }

      const recipes = await enrichRecipesWithGroundedImages(
        rawRecipes as Array<Record<string, unknown>>,
        sources
      );

      res.json({ recipes, sources });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Online recipe search failed.';
      console.error('search-online error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/recipes/import-url', async (req, res) => {
    try {
      const { input = '', isUrl = false, regionName = '' } = req.body ?? {};
      if (!String(input).trim()) {
        return res.status(400).json({ error: 'Please provide a recipe URL, title, or pasted recipe text.' });
      }

      const ai = getAIClient();
      const tools = isUrl ? [{ urlContext: {} }, { googleSearch: {} }] : [{ googleSearch: {} }];

      const prompt = isUrl
        ? `Read and extract the full recipe from this URL: ${input}
${regionName ? `Also add helpful ingredient substitute notes for someone cooking in ${regionName}.` : ''}
Return 1 recipe inside the "recipes" array.
${RECIPE_JSON_SCHEMA_GUIDE}`
        : `Look up or parse this recipe into a clean, complete family meal recipe:
"""
${input}
"""
${regionName ? `Also add helpful ingredient substitute notes for someone cooking in ${regionName}.` : ''}
Return 1 recipe inside the "recipes" array.
${RECIPE_JSON_SCHEMA_GUIDE}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You extract and normalize recipes from URLs, dish names, or pasted text into clean structured JSON with numeric ingredient amounts and step-by-step instructions.',
        },
      });

      const parsed = extractJSONFromText(response.text) as { recipes?: unknown[] } | unknown[] | null;
      const rawRecipes = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { recipes?: unknown[] }).recipes)
          ? (parsed as { recipes: unknown[] }).recipes
          : [];

      const sources = extractGroundingSources(response);

      if (!rawRecipes.length) {
        return res.status(422).json({
          error: 'Unable to parse a complete recipe from that link or text. Try pasting the recipe ingredients directly.',
          sources,
        });
      }

      const enriched = await enrichRecipesWithGroundedImages(
        rawRecipes as Array<Record<string, unknown>>,
        isUrl ? [{ title: 'Imported URL', uri: String(input).trim() }, ...sources] : sources
      );

      res.json({ recipe: enriched[0], sources });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recipe import failed.';
      console.error('import-url error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/meals/smart-suggestions', async (req, res) => {
    try {
      const {
        slot = 'dinner',
        day = 'Monday',
        preferences = {},
        pantryItems = [],
        excludeTitles = [],
        regionName = '',
      } = req.body ?? {};

      const ai = getAIClient();
      const prompt = `Suggest 3 fresh ${slot} meal replacement recipes for ${day}.
User Profile:
- Dietary restrictions: ${(preferences.dietaryRestrictions || []).join(', ') || 'None'}
- Nutritional goals: ${(preferences.nutritionGoals || []).join(', ') || 'Balanced'}
- Budget (purse): ${preferences.budgetTier || 'moderate'}
- Available equipment: ${(preferences.equipment || []).join(', ') || 'Standard kitchen'}
- Palate preference: ${preferences.palate || 'balanced'}
- Excluded ingredients: ${(preferences.excludedIngredients || []).join(', ') || 'None'}
- Current cooking region: ${regionName || 'Global'}
- Pantry items already on hand (prioritize these to minimize new grocery purchases): ${pantryItems.slice(0, 20).join(', ') || 'Basic staples'}
- Avoid repeating these meals already in the plan: ${excludeTitles.join(', ') || 'None'}

${RECIPE_JSON_SCHEMA_GUIDE}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are a thoughtful family meal planner suggesting practical, delicious replacement meals tailored to pantry items, budget, equipment, and culture. Never fabricate image URLs.',
        },
      });

      const parsed = extractJSONFromText(response.text) as { recipes?: unknown[] } | unknown[] | null;
      const rawRecipes = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { recipes?: unknown[] }).recipes)
          ? (parsed as { recipes: unknown[] }).recipes
          : [];
      const sources = extractGroundingSources(response);

      const recipes = await enrichRecipesWithGroundedImages(
        rawRecipes as Array<Record<string, unknown>>,
        sources
      );

      res.json({ recipes, sources });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Smart suggestion lookup failed.';
      console.error('smart-suggestions error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hearth & Table server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
