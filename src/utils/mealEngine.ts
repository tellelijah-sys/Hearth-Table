import type {
  AggregatedGroceryItem,
  BudgetTier,
  CustomGroceryItem,
  DayOfWeek,
  MealPreferenceRecord,
  MealSlot,
  PantryItem,
  Recipe,
  RotationFrequency,
  UserPreferences,
  WeeklyPlan,
} from '../types/meal';
import { getRegionById } from '../data/regions';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export function createEmptyWeeklyPlan(): WeeklyPlan {
  return {
    Monday: { breakfast: null, lunch: null, dinner: null },
    Tuesday: { breakfast: null, lunch: null, dinner: null },
    Wednesday: { breakfast: null, lunch: null, dinner: null },
    Thursday: { breakfast: null, lunch: null, dinner: null },
    Friday: { breakfast: null, lunch: null, dinner: null },
    Saturday: { breakfast: null, lunch: null, dinner: null },
    Sunday: { breakfast: null, lunch: null, dinner: null },
  };
}

export function normalizeIngredientName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ingredientMatchesPantry(
  ingredientName: string,
  pantry: PantryItem[]
): PantryItem | undefined {
  const normIng = normalizeIngredientName(ingredientName);
  const ingWords = normIng.split(' ').filter((w) => w.length > 2);

  return pantry.find((p) => {
    const normP = normalizeIngredientName(p.name);
    if (normIng.includes(normP) || normP.includes(normIng)) return true;
    const pWords = normP.split(' ').filter((w) => w.length > 2);
    return pWords.some((pw) => ingWords.includes(pw));
  });
}

export interface RecipeScoreResult {
  recipe: Recipe;
  score: number;
  pantryMatches: number;
  pantryTotal: number;
  pantryPercent: number;
  missingIngredients: string[];
  usesSoonCount: number;
  fitsEquipment: boolean;
  fitsDietary: boolean;
  fitsExclusions: boolean;
  reasons: string[];
}

const BUDGET_ORDER: Record<BudgetTier, number> = {
  thrifty: 1,
  moderate: 2,
  special: 3,
};

const FREQUENCY_WEIGHT: Record<RotationFrequency, number> = {
  weekly: 42,
  biweekly: 28,
  monthly: 14,
  occasional: 4,
  paused: -100,
};

export function scoreRecipeForUser(
  recipe: Recipe,
  prefs: UserPreferences,
  pantry: PantryItem[],
  mealPrefs: Record<string, MealPreferenceRecord>,
  minimizeGroceries = false
): RecipeScoreResult {
  const reasons: string[] = [];

  // Dietary restriction hard check
  const fitsDietary = prefs.dietaryRestrictions.every((tag) =>
    recipe.dietaryTags.includes(tag)
  );

  // Excluded ingredients hard check
  const excludedLower = prefs.excludedIngredients.map((e) => normalizeIngredientName(e));
  const fitsExclusions = !recipe.ingredients.some((ing) => {
    const n = normalizeIngredientName(ing.name);
    return excludedLower.some((ex) => ex && n.includes(ex));
  });

  // Equipment compatibility
  const fitsEquipment =
    prefs.equipment.length === 0 ||
    recipe.equipment.some((eq) => prefs.equipment.includes(eq));

  // Pantry overlap & missing ingredients
  let pantryMatches = 0;
  let usesSoonCount = 0;
  const missingIngredients: string[] = [];
  for (const ing of recipe.ingredients) {
    const matched = ingredientMatchesPantry(ing.name, pantry);
    if (matched) {
      pantryMatches++;
      if (matched.useSoon) usesSoonCount++;
    } else {
      missingIngredients.push(ing.name);
    }
  }
  const pantryTotal = recipe.ingredients.length || 1;
  const pantryPercent = Math.round((pantryMatches / pantryTotal) * 100);

  let score = 0;
  if (!fitsDietary) score -= 500;
  if (!fitsExclusions) score -= 500;
  if (!fitsEquipment) score -= 120;

  // Pantry match bonus (heavier when minimizing grocery purchases)
  const pantryWeight = minimizeGroceries ? 28 : 14;
  const missingPenalty = minimizeGroceries ? missingIngredients.length * 16 : 0;
  score += pantryMatches * pantryWeight - missingPenalty;
  if (minimizeGroceries) {
    score += Math.round(pantryPercent * 0.8);
  }
  score += usesSoonCount * 24;

  if (missingIngredients.length === 0 && pantryTotal > 0) {
    reasons.push('100% ready from pantry');
  } else if (usesSoonCount > 0) {
    reasons.push(`Uses ${usesSoonCount} expiring pantry item${usesSoonCount > 1 ? 's' : ''}`);
  } else if (pantryMatches >= 2) {
    reasons.push(`${pantryMatches}/${pantryTotal} ingredients in pantry`);
  }

  // Budget (Purse) fit
  const userBudget = BUDGET_ORDER[prefs.budgetTier];
  const recipeBudget = BUDGET_ORDER[recipe.budgetTier];
  if (recipeBudget <= userBudget) {
    score += 18;
    if (recipe.budgetTier === 'thrifty') reasons.push('Budget-friendly');
  } else {
    score -= (recipeBudget - userBudget) * 20;
  }

  // Nutritional goal overlap
  const goalMatches = prefs.nutritionGoals.filter((g) =>
    recipe.nutritionGoals.includes(g)
  );
  score += goalMatches.length * 15;
  if (goalMatches.length > 0) {
    reasons.push(`Matches ${goalMatches[0].replace('-', ' ')}`);
  }

  // Palate fit
  if (recipe.palate === prefs.palate) {
    score += 14;
  } else if (prefs.palate === 'familiar' && recipe.palate === 'adventurous') {
    score -= 22;
  }

  // Cuisine preference
  if (prefs.preferredCuisines.includes(recipe.cuisine)) {
    score += 16;
  }

  // Regional staple alignment
  const region = getRegionById(prefs.regionId);
  const regionalMatches = recipe.ingredients.filter((ing) =>
    region.localStaples.some((st) =>
      normalizeIngredientName(ing.name).includes(normalizeIngredientName(st))
    )
  ).length;
  score += regionalMatches * 4;

  // Liked & frequency boost
  const prefRecord = mealPrefs[recipe.id];
  if (prefRecord) {
    if (prefRecord.liked) {
      score += 20;
      reasons.push('Saved favorite');
    }
    score += FREQUENCY_WEIGHT[prefRecord.frequency];
  }

  return {
    recipe,
    score,
    pantryMatches,
    pantryTotal,
    pantryPercent,
    missingIngredients,
    usesSoonCount,
    fitsEquipment,
    fitsDietary,
    fitsExclusions,
    reasons: reasons.slice(0, 3),
  };
}

export function generateSmartWeekPlan(
  recipes: Recipe[],
  prefs: UserPreferences,
  pantry: PantryItem[],
  mealPrefs: Record<string, MealPreferenceRecord>,
  existingPlan?: WeeklyPlan,
  preserveFilled = false,
  minimizeGroceries = false,
  pantryOnly = false
): WeeklyPlan {
  const plan: WeeklyPlan = existingPlan
    ? JSON.parse(JSON.stringify(existingPlan))
    : createEmptyWeeklyPlan();

  if (pantryOnly && pantry.length === 0) {
    return createEmptyWeeklyPlan();
  }

  const scoredAll = recipes
    .map((r) => scoreRecipeForUser(r, prefs, pantry, mealPrefs, minimizeGroceries || pantryOnly))
    .filter((s) => {
      if (!s.fitsDietary || !s.fitsExclusions) return false;
      if (!pantryOnly && mealPrefs[s.recipe.id]?.frequency === 'paused') return false;
      if (pantryOnly && s.pantryMatches === 0) return false;
      return true;
    })
    .sort((a, b) => {
      if (pantryOnly) {
        if (a.missingIngredients.length !== b.missingIngredients.length) {
          return a.missingIngredients.length - b.missingIngredients.length;
        }
        if (b.pantryPercent !== a.pantryPercent) return b.pantryPercent - a.pantryPercent;
        if (b.usesSoonCount !== a.usesSoonCount) return b.usesSoonCount - a.usesSoonCount;
        return b.pantryMatches - a.pantryMatches;
      }
      return b.score - a.score;
    });

  if (pantryOnly && scoredAll.length === 0) {
    return createEmptyWeeklyPlan();
  }

  const usageCount: Record<string, number> = {};
  for (const day of DAYS_OF_WEEK) {
    for (const slot of MEAL_SLOTS) {
      const id = plan[day][slot];
      if (id) usageCount[id] = (usageCount[id] ?? 0) + 1;
    }
  }

  const activeSlots = prefs.activeSlots.length
    ? prefs.activeSlots
    : (['breakfast', 'lunch', 'dinner'] as MealSlot[]);

  for (const day of DAYS_OF_WEEK) {
    for (const slot of activeSlots) {
      if (preserveFilled && plan[day][slot]) continue;

      const candidates = scoredAll.filter((s) => s.recipe.mealTypes.includes(slot));
      const fallbackCandidates = candidates.length ? candidates : scoredAll;

      let best: RecipeScoreResult | null = null;
      let bestEffectiveScore = -Infinity;

      for (const cand of fallbackCandidates) {
        const used = usageCount[cand.recipe.id] ?? 0;
        const freq = mealPrefs[cand.recipe.id]?.frequency;
        const maxPerWeek = pantryOnly || minimizeGroceries
          ? 3
          : slot === 'breakfast'
            ? 3
            : freq === 'weekly'
              ? 2
              : 1;
        const baseScore = pantryOnly
          ? cand.pantryPercent * 10 - cand.missingIngredients.length * 45 + cand.usesSoonCount * 35
          : cand.score;
        const repeatPenalty =
          used >= maxPerWeek ? used * 85 : used * (pantryOnly || minimizeGroceries ? 18 : 32);
        const effective = baseScore - repeatPenalty;
        if (effective > bestEffectiveScore) {
          bestEffectiveScore = effective;
          best = cand;
        }
      }

      if (best) {
        plan[day][slot] = best.recipe.id;
        usageCount[best.recipe.id] = (usageCount[best.recipe.id] ?? 0) + 1;
      }
    }
  }

  return plan;
}

export function getReplacementSuggestions(
  slot: MealSlot,
  currentRecipeId: string | null,
  currentPlan: WeeklyPlan,
  recipes: Recipe[],
  prefs: UserPreferences,
  pantry: PantryItem[],
  mealPrefs: Record<string, MealPreferenceRecord>
): RecipeScoreResult[] {
  const alreadyInWeek = new Set<string>();
  for (const d of DAYS_OF_WEEK) {
    for (const s of MEAL_SLOTS) {
      const id = currentPlan[d][s];
      if (id) alreadyInWeek.add(id);
    }
  }

  return recipes
    .filter((r) => r.id !== currentRecipeId && mealPrefs[r.id]?.frequency !== 'paused')
    .map((r) => scoreRecipeForUser(r, prefs, pantry, mealPrefs))
    .filter((s) => s.fitsDietary && s.fitsExclusions)
    .sort((a, b) => {
      const aSlotBonus = a.recipe.mealTypes.includes(slot) ? 35 : 0;
      const bSlotBonus = b.recipe.mealTypes.includes(slot) ? 35 : 0;
      const aFreshBonus = alreadyInWeek.has(a.recipe.id) ? -25 : 15;
      const bFreshBonus = alreadyInWeek.has(b.recipe.id) ? -25 : 15;
      return b.score + bSlotBonus + bFreshBonus - (a.score + aSlotBonus + aFreshBonus);
    })
    .slice(0, 8);
}

export function buildSyncedGroceryList(
  plan: WeeklyPlan,
  recipes: Recipe[],
  pantry: PantryItem[],
  householdSize: number,
  checkedMap: Record<string, boolean>
): AggregatedGroceryItem[] {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const map = new Map<string, AggregatedGroceryItem>();

  for (const day of DAYS_OF_WEEK) {
    for (const slot of MEAL_SLOTS) {
      const recipeId = plan[day][slot];
      if (!recipeId) continue;
      const recipe = recipeMap.get(recipeId);
      if (!recipe) continue;

      const scale = householdSize / (recipe.defaultServings || 4);

      for (const ing of recipe.ingredients) {
        const normName = normalizeIngredientName(ing.name);
        const normUnit = ing.unit.toLowerCase().trim();
        const key = `${normName}__${normUnit}`;
        const scaledQty = Math.round(ing.quantity * scale * 100) / 100;

        const existing = map.get(key);
        if (existing) {
          existing.totalQuantity = Math.round((existing.totalQuantity + scaledQty) * 100) / 100;
          if (!existing.fromRecipes.includes(recipe.title)) {
            existing.fromRecipes.push(recipe.title);
          }
          if (ing.substitutes) {
            for (const sub of ing.substitutes) {
              if (!existing.substitutes.includes(sub)) existing.substitutes.push(sub);
            }
          }
        } else {
          const pantryHit = ingredientMatchesPantry(ing.name, pantry);
          map.set(key, {
            key,
            name: ing.name,
            totalQuantity: scaledQty,
            unit: ing.unit,
            aisle: ing.aisle,
            inPantry: !!pantryHit,
            pantryUseSoon: !!pantryHit?.useSoon,
            checked: !!checkedMap[key],
            fromRecipes: [recipe.title],
            substitutes: ing.substitutes ? [...ing.substitutes] : [],
          });
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function formatQuantity(qty: number): string {
  if (qty <= 0) return '';
  const whole = Math.floor(qty);
  const frac = qty - whole;
  const approxFrac =
    Math.abs(frac - 0.25) < 0.08
      ? '¼'
      : Math.abs(frac - 0.33) < 0.08
        ? '⅓'
        : Math.abs(frac - 0.5) < 0.08
          ? '½'
          : Math.abs(frac - 0.67) < 0.08
            ? '⅔'
            : Math.abs(frac - 0.75) < 0.08
              ? '¾'
              : '';
  if (approxFrac) {
    return whole > 0 ? `${whole} ${approxFrac}` : approxFrac;
  }
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(1).replace(/\.0$/, '');
}

export function formatGroceryListPlainText(
  neededItems: AggregatedGroceryItem[],
  customItems: CustomGroceryItem[]
): string {
  const lines: string[] = ['Hearth & Table — Weekly Grocery List', ''];
  const byAisle = new Map<string, string[]>();

  for (const item of neededItems) {
    if (item.checked) continue;
    const list = byAisle.get(item.aisle) ?? [];
    list.push(`- [ ] ${formatQuantity(item.totalQuantity)} ${item.unit} ${item.name}`);
    byAisle.set(item.aisle, list);
  }
  for (const item of customItems) {
    if (item.checked) continue;
    const list = byAisle.get(item.aisle) ?? [];
    list.push(`- [ ] ${item.quantityText ? `${item.quantityText} ` : ''}${item.name}`);
    byAisle.set(item.aisle, list);
  }

  for (const [aisle, items] of byAisle.entries()) {
    lines.push(`${aisle}:`);
    lines.push(...items);
    lines.push('');
  }

  return lines.join('\n').trim();
}
