import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ExternalLink,
  Filter,
  Globe,
  Heart,
  Link2,
  Plus,
  RefreshCw,
  Search,
  WifiOff,
  X,
} from 'lucide-react';
import type {
  BudgetTier,
  CuisineRegion,
  DayOfWeek,
  DietaryTag,
  EquipmentType,
  GroceryAisle,
  MealPreferenceRecord,
  MealSlot,
  NutritionGoal,
  PantryItem,
  Recipe,
  RotationFrequency,
  TravelRegion,
  UserPreferences,
} from '../types/meal';
import { DAYS_OF_WEEK, MEAL_SLOTS, scoreRecipeForUser } from '../utils/mealEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { RecipeThumbnail } from './RecipeThumbnail';

interface DiscoverRecipesViewProps {
  recipes: Recipe[];
  pantry: PantryItem[];
  preferences: UserPreferences;
  mealPreferences: Record<string, MealPreferenceRecord>;
  region: TravelRegion;
  pantryOnlineSearchNonce: number;
  onOpenRecipe: (recipe: Recipe) => void;
  onToggleLike: (recipeId: string) => void;
  onSetFrequency: (recipeId: string, freq: RotationFrequency) => void;
  onSaveImportedRecipe: (recipe: Recipe) => void;
  onAssignToPlan: (recipeId: string, day: DayOfWeek, slot: MealSlot) => void;
}

const ALL_CUISINES: CuisineRegion[] = [
  'West African',
  'East Asian',
  'South Asian',
  'Mediterranean',
  'Latin American',
  'Middle Eastern',
  'Caribbean',
  'European',
  'North American',
  'Southeast Asian',
];

const ALL_DIETARY: DietaryTag[] = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'pescatarian',
];

const ALL_GOALS: NutritionGoal[] = [
  'balanced',
  'high-protein',
  'high-fiber',
  'heart-healthy',
  'low-carb',
  'calorie-conscious',
  'kid-friendly',
];

const ALL_EQUIPMENT: EquipmentType[] = [
  'stovetop',
  'one-pot',
  'oven',
  'air-fryer',
  'slow-cooker',
  'no-cook',
  'blender',
];

export const DiscoverRecipesView: React.FC<DiscoverRecipesViewProps> = ({
  recipes,
  pantry,
  preferences,
  mealPreferences,
  region,
  pantryOnlineSearchNonce,
  onOpenRecipe,
  onToggleLike,
  onSetFrequency,
  onSaveImportedRecipe,
  onAssignToPlan,
}) => {
  const isOnline = useOnlineStatus();
  const [mode, setMode] = useState<'offline' | 'online'>('offline');

  // Local filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineRegion | 'All'>('All');
  const [selectedDietary, setSelectedDietary] = useState<DietaryTag[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<NutritionGoal[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetTier | 'All'>('All');
  const [pantryFirst, setPantryFirst] = useState(true);
  const [likedOnly, setLikedOnly] = useState(false);

  // Quick plan modal state
  const [assignTarget, setAssignTarget] = useState<Recipe | null>(null);
  const [assignDay, setAssignDay] = useState<DayOfWeek>('Monday');
  const [assignSlot, setAssignSlot] = useState<MealSlot>('dinner');

  // Custom recipe form modal
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCuisine, setCustomCuisine] = useState<CuisineRegion>('West African');
  const [customIngredientsText, setCustomIngredientsText] = useState('');
  const [customInstructionsText, setCustomInstructionsText] = useState('');

  // Online search & import state
  const [onlineQuery, setOnlineQuery] = useState('');
  const [prioritizePantryOnline, setPrioritizePantryOnline] = useState(true);
  const [onlineResults, setOnlineResults] = useState<Recipe[]>([]);
  const [onlineSources, setOnlineSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [importInput, setImportInput] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const toggleArr = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const normalizeRawOnlineRecipe = (
    raw: Partial<Recipe>,
    idx: number,
    sources: Array<{ title: string; uri: string }>,
    sourceUrl?: string
  ): Recipe => ({
    id: `online-${Date.now()}-${idx}`,
    title: raw.title || 'Imported Recipe',
    description: raw.description || 'Imported from web recipe search.',
    cuisine: raw.cuisine || 'Mediterranean',
    mealTypes: raw.mealTypes?.length ? raw.mealTypes : ['dinner'],
    prepMinutes: Number(raw.prepMinutes) || 15,
    cookMinutes: Number(raw.cookMinutes) || 25,
    defaultServings: Number(raw.defaultServings) || 4,
    budgetTier: raw.budgetTier || 'moderate',
    equipment: raw.equipment?.length ? raw.equipment : ['stovetop'],
    dietaryTags: Array.isArray(raw.dietaryTags) ? raw.dietaryTags : [],
    nutritionGoals: Array.isArray(raw.nutritionGoals) ? raw.nutritionGoals : ['balanced'],
    palate: raw.palate || 'balanced',
    kidFriendly: raw.kidFriendly ?? true,
    calories: Number(raw.calories) || 450,
    proteinGrams: Number(raw.proteinGrams) || 20,
    carbsGrams: Number(raw.carbsGrams) || 48,
    fatGrams: Number(raw.fatGrams) || 15,
    fiberGrams: Number(raw.fiberGrams) || 6,
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map((i) => ({
          name: i.name || 'ingredient',
          quantity: Number(i.quantity) || 1,
          unit: i.unit || 'cup',
          aisle: (i.aisle as GroceryAisle) || 'Canned & Dry Goods',
          substitutes: i.substitutes || [],
        }))
      : [],
    instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
    regionalNotes: raw.regionalNotes,
    imageUrl: typeof raw.imageUrl === 'string' && raw.imageUrl.trim() ? raw.imageUrl.trim() : undefined,
    sourceUrl: sourceUrl || (typeof raw.sourceUrl === 'string' ? raw.sourceUrl : undefined),
    sources,
    isCustomOrImported: true,
  });

  const runOnlineSearch = async (queryOverride?: string, forcePantry = false) => {
    if (!isOnline) return;
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const res = await fetch('/api/recipes/search-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: (queryOverride ?? onlineQuery).trim() || 'quick wholesome family dinner',
          cuisine: selectedCuisine !== 'All' ? selectedCuisine : '',
          dietary: [...new Set([...preferences.dietaryRestrictions, ...selectedDietary])],
          nutritionGoals: [...new Set([...preferences.nutritionGoals, ...selectedGoals])],
          equipment: selectedEquipment.length ? selectedEquipment : preferences.equipment,
          budget: selectedBudget !== 'All' ? selectedBudget : preferences.budgetTier,
          palate: preferences.palate,
          regionName: region.name,
          localStaples: region.localStaples,
          pantryItems: pantry.map((p) => p.name),
          prioritizePantry: forcePantry || prioritizePantryOnline,
          excludeIngredients: preferences.excludedIngredients,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Online recipe search failed.');
      const sources = data.sources || [];
      const mapped = (data.recipes || []).map((r: Partial<Recipe>, idx: number) =>
        normalizeRawOnlineRecipe(r, idx, sources)
      );
      setOnlineResults(mapped);
      setOnlineSources(sources);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Unable to search online recipes.');
    } finally {
      setOnlineLoading(false);
    }
  };

  useEffect(() => {
    if (pantryOnlineSearchNonce > 0) {
      setMode('online');
      setPrioritizePantryOnline(true);
      const topPantry = pantry.slice(0, 6).map((p) => p.name).join(', ');
      const q = topPantry
        ? `meals using ${topPantry}`
        : 'pantry staple family meals';
      setOnlineQuery(q);
      void runOnlineSearch(q, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantryOnlineSearchNonce]);

  const filteredOffline = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes
      .map((r) => scoreRecipeForUser(r, preferences, pantry, mealPreferences, pantryFirst))
      .filter(({ recipe }) => {
        if (q) {
          const matchTitle = recipe.title.toLowerCase().includes(q);
          const matchIng = recipe.ingredients.some((i) => i.name.toLowerCase().includes(q));
          const matchCuisine = recipe.cuisine.toLowerCase().includes(q);
          if (!matchTitle && !matchIng && !matchCuisine) return false;
        }
        if (selectedCuisine !== 'All' && recipe.cuisine !== selectedCuisine) return false;
        if (selectedBudget !== 'All' && recipe.budgetTier !== selectedBudget) return false;
        if (selectedDietary.length && !selectedDietary.every((d) => recipe.dietaryTags.includes(d)))
          return false;
        if (selectedGoals.length && !selectedGoals.some((g) => recipe.nutritionGoals.includes(g)))
          return false;
        if (
          selectedEquipment.length &&
          !recipe.equipment.some((eq) => selectedEquipment.includes(eq))
        )
          return false;
        if (likedOnly && !mealPreferences[recipe.id]?.liked) return false;
        return true;
      })
      .sort((a, b) => {
        if (pantryFirst) {
          if (b.pantryPercent !== a.pantryPercent) return b.pantryPercent - a.pantryPercent;
        }
        return b.score - a.score;
      });
  }, [
    recipes,
    preferences,
    pantry,
    mealPreferences,
    searchQuery,
    selectedCuisine,
    selectedBudget,
    selectedDietary,
    selectedGoals,
    selectedEquipment,
    likedOnly,
    pantryFirst,
  ]);

  const handleOnlineSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runOnlineSearch();
  };

  const handleImportUrlOrText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline || !importInput.trim()) return;
    setImportLoading(true);
    setOnlineError(null);
    setImportSuccess(null);
    try {
      const trimmed = importInput.trim();
      const isUrl = /^https?:\/\//i.test(trimmed);
      const res = await fetch('/api/recipes/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmed,
          isUrl,
          regionName: region.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      const sources = data.sources || [];
      const imported = normalizeRawOnlineRecipe(
        data.recipe,
        0,
        sources,
        isUrl ? trimmed : undefined
      );
      onSaveImportedRecipe(imported);
      setImportSuccess(`Imported "${imported.title}" into your offline recipe box.`);
      setImportInput('');
      setAssignTarget(imported);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Could not import recipe.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateCustomRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const ingLines = customIngredientsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const ingredients = ingLines.map((line) => {
      const m = line.match(/^([\d.]+)\s+([a-zA-Z]+)\s+(.+)$/);
      if (m) {
        return {
          name: m[3].trim(),
          quantity: Number(m[1]) || 1,
          unit: m[2].trim(),
          aisle: 'Produce' as GroceryAisle,
        };
      }
      return {
        name: line,
        quantity: 1,
        unit: 'portion',
        aisle: 'Produce' as GroceryAisle,
      };
    });

    const instructions = customInstructionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const custom: Recipe = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      description: 'Personal family recipe saved directly to your offline recipe box.',
      cuisine: customCuisine,
      mealTypes: ['lunch', 'dinner'],
      prepMinutes: 15,
      cookMinutes: 25,
      defaultServings: preferences.householdSize,
      budgetTier: 'moderate',
      equipment: ['stovetop'],
      dietaryTags: [],
      nutritionGoals: ['balanced'],
      palate: 'familiar',
      kidFriendly: true,
      calories: 450,
      proteinGrams: 22,
      carbsGrams: 48,
      fatGrams: 15,
      fiberGrams: 6,
      ingredients: ingredients.length
        ? ingredients
        : [{ name: 'Main ingredients', quantity: 1, unit: 'batch', aisle: 'Produce' }],
      instructions: instructions.length
        ? instructions
        : ['Prepare ingredients and cook until tender.'],
      isCustomOrImported: true,
    };
    onSaveImportedRecipe(custom);
    setCustomTitle('');
    setCustomIngredientsText('');
    setCustomInstructionsText('');
    setShowCustomForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Segmented Switch */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#17211C] dark:text-[#ECF1EE]">
            Recipe Box &amp; Global Discovery
          </h1>
          <p className="mt-1 text-sm text-[#55655D] dark:text-[#A9B8B0]">
            Filter offline family classics by pantry, nutrition, budget &amp; gear, or source fresh recipes online.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EEF2EE] dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] self-start">
          <button
            type="button"
            onClick={() => setMode('offline')}
            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'offline'
                ? 'bg-white dark:bg-[#232F29] text-[#17211C] dark:text-white shadow-sm'
                : 'text-[#55655D] dark:text-[#A9B8B0]'
            }`}
          >
            Offline Library ({recipes.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('online')}
            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              mode === 'online'
                ? 'bg-white dark:bg-[#232F29] text-[#17211C] dark:text-white shadow-sm'
                : 'text-[#55655D] dark:text-[#A9B8B0]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Search Online &amp; Import</span>
          </button>
        </div>
      </div>

      {mode === 'offline' ? (
        <>
          {/* Search + Filter Controls */}
          <div className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#55655D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes, ingredients, or cuisines..."
                  className="w-full min-h-[44px] pl-10 pr-4 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPantryFirst((v) => !v)}
                  className={`min-h-[44px] px-3.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    pantryFirst
                      ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                      : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  Pantry Match First
                </button>
                <button
                  type="button"
                  onClick={() => setLikedOnly((v) => !v)}
                  className={`min-h-[44px] px-3.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    likedOnly
                      ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                      : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Liked</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className="min-h-[44px] px-3.5 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] whitespace-nowrap shrink-0"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Custom Filters</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="min-h-[44px] px-3.5 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>My Recipe</span>
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="pt-4 border-t border-[#E2E8E2] dark:border-[#242D29] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#55655D] dark:text-[#A9B8B0] mb-1.5">
                      Cuisine / Culture
                    </label>
                    <select
                      value={selectedCuisine}
                      onChange={(e) => setSelectedCuisine(e.target.value as CuisineRegion | 'All')}
                      className="w-full min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm"
                    >
                      <option value="All">All Global Cuisines</option>
                      {ALL_CUISINES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#55655D] dark:text-[#A9B8B0] mb-1.5">
                      Budget (Purse)
                    </label>
                    <select
                      value={selectedBudget}
                      onChange={(e) => setSelectedBudget(e.target.value as BudgetTier | 'All')}
                      className="w-full min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm capitalize"
                    >
                      <option value="All">Any Budget</option>
                      <option value="thrifty">Thrifty / Budget-Smart</option>
                      <option value="moderate">Moderate</option>
                      <option value="special">Special Occasion</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#55655D] dark:text-[#A9B8B0] mb-1.5">
                    Nutritional Goals
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_GOALS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSelectedGoals(toggleArr(selectedGoals, g))}
                        className={`min-h-[38px] px-3 rounded-lg text-xs font-medium capitalize border ${
                          selectedGoals.includes(g)
                            ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                            : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                        }`}
                      >
                        {g.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#55655D] dark:text-[#A9B8B0] mb-1.5">
                    Dietary Restrictions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DIETARY.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDietary(toggleArr(selectedDietary, d))}
                        className={`min-h-[38px] px-3 rounded-lg text-xs font-medium capitalize border ${
                          selectedDietary.includes(d)
                            ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                            : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#55655D] dark:text-[#A9B8B0] mb-1.5">
                    Kitchen Equipment Filter
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_EQUIPMENT.map((eq) => (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => setSelectedEquipment(toggleArr(selectedEquipment, eq))}
                        className={`min-h-[38px] px-3 rounded-lg text-xs font-medium capitalize border ${
                          selectedEquipment.includes(eq)
                            ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                            : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                        }`}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recipe Grid */}
          {filteredOffline.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-10 text-center">
              <p className="font-display text-lg font-semibold">No recipes match those exact filters</p>
              <p className="mt-1 text-sm text-[#55655D] dark:text-[#A9B8B0]">
                Clear a filter or switch to Search Online to discover and import matching recipes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCuisine('All');
                  setSelectedDietary([]);
                  setSelectedGoals([]);
                  setSelectedEquipment([]);
                  setSelectedBudget('All');
                  setLikedOnly(false);
                }}
                className="mt-4 min-h-[44px] px-4 py-2 rounded-lg bg-[#1B5E3F] text-white text-sm font-medium"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOffline.map(({ recipe, pantryMatches, pantryTotal, pantryPercent, missingIngredients }) => {
                const pref = mealPreferences[recipe.id];
                const liked = pref?.liked ?? false;
                const frequency = pref?.frequency ?? 'occasional';
                return (
                  <article
                    key={recipe.id}
                    className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenRecipe(recipe)}
                        className="block w-full text-left"
                      >
                        <RecipeThumbnail
                          imageUrl={recipe.imageUrl}
                          title={recipe.title}
                          cuisine={recipe.cuisine}
                          className="w-full h-44"
                        />
                      </button>
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-[#55655D] dark:text-[#A9B8B0] truncate">
                            {recipe.cuisine} · {recipe.prepMinutes + recipe.cookMinutes}m ·{' '}
                            <span className="capitalize">{recipe.budgetTier}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => onToggleLike(recipe.id)}
                            aria-label={liked ? `Unlike ${recipe.title}` : `Like ${recipe.title}`}
                            className="min-h-[44px] min-w-[44px] -mr-2 -my-2 flex items-center justify-center text-[#55655D]"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                liked
                                  ? 'fill-[#1B5E3F] text-[#1B5E3F] dark:fill-[#6EE7B7] dark:text-[#6EE7B7]'
                                  : ''
                              }`}
                            />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenRecipe(recipe)}
                          className="mt-1 text-left font-display text-lg font-semibold text-[#17211C] dark:text-[#ECF1EE] hover:text-[#1B5E3F] dark:hover:text-[#6EE7B7]"
                        >
                          {recipe.title}
                        </button>

                        <p className="mt-1.5 text-xs text-[#55655D] dark:text-[#A9B8B0] line-clamp-2 leading-relaxed">
                          {recipe.description}
                        </p>

                        <p className="mt-3 text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7] tabular-nums">
                          {pantryMatches}/{pantryTotal} in pantry ({pantryPercent}%)
                          {missingIngredients.length === 0
                            ? ' · Ready to cook'
                            : ` · Buy ${missingIngredients.length}`}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-[#F0F4F0] dark:border-[#222B27] flex items-center justify-between gap-2">
                      <select
                        aria-label={`Rotation frequency for ${recipe.title}`}
                        value={frequency}
                        onChange={(e) =>
                          onSetFrequency(recipe.id, e.target.value as RotationFrequency)
                        }
                        className="min-h-[40px] rounded-lg border border-[#E2E8E2] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-2 text-xs text-[#3F4E46] dark:text-[#A9B8B0]"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="occasional">Occasional</option>
                        <option value="paused">Pause</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setAssignTarget(recipe);
                          setAssignSlot(recipe.mealTypes[0] || 'dinner');
                        }}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#1B5E3F] text-white text-xs font-medium hover:bg-[#164C33] whitespace-nowrap shrink-0"
                      >
                        Add to Plan
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Online Recipe Search & URL Import Mode */
        <div className="space-y-6">
          {!isOnline && (
            <div className="rounded-xl border border-[#B45309]/30 bg-[#FEF3C7] dark:bg-[#2E2111] p-4 flex items-center gap-3 text-sm text-[#92400E] dark:text-[#FCD34D]">
              <WifiOff className="w-5 h-5 shrink-0" />
              <span>
                You are currently offline. Connect to Wi-Fi or mobile data to search web recipes or import URLs. Your saved offline library remains fully available.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Search Online */}
            <form
              onSubmit={handleOnlineSearch}
              className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-6 space-y-4"
            >
              <div>
                <h2 className="font-display text-xl font-semibold text-[#17211C] dark:text-[#ECF1EE]">
                  Search Online Recipes
                </h2>
                <p className="mt-1 text-xs text-[#55655D] dark:text-[#A9B8B0]">
                  Uses Google Search grounding with your dietary profile, {region.name} ingredients, budget, and pantry items. Pulls recipe photos when available from online sources.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={onlineQuery}
                  onChange={(e) => setOnlineQuery(e.target.value)}
                  placeholder="e.g. Ghanaian Waakye, quick high-protein soup, budget pasta..."
                  className="flex-1 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={!isOnline || onlineLoading}
                  className="min-h-[44px] px-5 rounded-lg bg-[#1B5E3F] text-white text-sm font-medium hover:bg-[#164C33] disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {onlineLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>{onlineLoading ? 'Searching...' : 'Search Web'}</span>
                </button>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-[#3F4E46] dark:text-[#A9B8B0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={prioritizePantryOnline}
                  onChange={(e) => setPrioritizePantryOnline(e.target.checked)}
                  className="w-4 h-4 accent-[#1B5E3F]"
                />
                <span>Prioritize my {pantry.length} pantry ingredients to minimize grocery shopping</span>
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  'Quick West African stew',
                  'Budget high-protein lentils',
                  'Kid-friendly one-pot pasta',
                  'East Asian 20-minute dinner',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setOnlineQuery(sample)}
                    className="min-h-[36px] px-2.5 py-1 rounded-md border border-[#E2E8E2] dark:border-[#2B3731] text-xs text-[#55655D] dark:text-[#A9B8B0] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </form>

            {/* Import from URL or Pasted Recipe */}
            <form
              onSubmit={handleImportUrlOrText}
              className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-6 space-y-4"
            >
              <div>
                <h2 className="font-display text-xl font-semibold text-[#17211C] dark:text-[#ECF1EE]">
                  Import Recipe Link or Text
                </h2>
                <p className="mt-1 text-xs text-[#55655D] dark:text-[#A9B8B0]">
                  Paste a recipe webpage URL or copied ingredient list to save it offline and sync with your grocery list.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-[#55655D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="https://... or paste recipe title & ingredients"
                    className="w-full min-h-[44px] pl-10 pr-3 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!isOnline || importLoading || !importInput.trim()}
                  className="min-h-[44px] px-5 rounded-lg bg-[#17211C] dark:bg-[#ECF1EE] text-white dark:text-[#17211C] text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {importLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>{importLoading ? 'Importing...' : 'Import'}</span>
                </button>
              </div>

              {importSuccess && (
                <p className="text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7]">
                  {importSuccess}
                </p>
              )}
            </form>
          </div>

          {onlineError && (
            <div className="rounded-xl border border-[#DC2626]/30 bg-[#FEE2E2]/60 dark:bg-[#7F1D1D]/20 p-4 text-sm text-[#B91C1C] dark:text-[#FCA5A5]">
              {onlineError}
            </div>
          )}

          {onlineResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-xl font-semibold">Online Suggested Menus</h3>
                {onlineSources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#55655D] dark:text-[#A9B8B0]">
                    <span>Grounded sources:</span>
                    {onlineSources.slice(0, 3).map((s) => (
                      <a
                        key={s.uri}
                        href={s.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#1B5E3F] dark:text-[#6EE7B7] hover:underline"
                      >
                        <span className="truncate max-w-[160px]">{s.title}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {onlineResults.map((r) => {
                  const isSaved = savedIds[r.id];
                  const scored = scoreRecipeForUser(r, preferences, pantry, mealPreferences);
                  return (
                    <article
                      key={r.id}
                      className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenRecipe(r)}
                          className="block w-full text-left"
                        >
                          <RecipeThumbnail
                            imageUrl={r.imageUrl}
                            title={r.title}
                            cuisine={r.cuisine}
                            className="w-full h-48"
                          />
                        </button>

                        <div className="p-5">
                          <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">
                            {r.cuisine} · {r.prepMinutes + r.cookMinutes}m ·{' '}
                            <span className="capitalize">{r.budgetTier}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => onOpenRecipe(r)}
                            className="mt-1 text-left font-display text-lg font-semibold text-[#17211C] dark:text-[#ECF1EE] hover:text-[#1B5E3F]"
                          >
                            {r.title}
                          </button>
                          <p className="mt-1.5 text-xs text-[#55655D] dark:text-[#A9B8B0] leading-relaxed">
                            {r.description}
                          </p>
                          <p className="mt-2.5 text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7] tabular-nums">
                            {scored.pantryMatches}/{scored.pantryTotal} in your pantry ({scored.pantryPercent}%)
                          </p>
                          <p className="mt-1 text-xs text-[#3F4E46] dark:text-[#CBD5CF]">
                            Key ingredients: {r.ingredients.slice(0, 5).map((i) => i.name).join(', ')}
                          </p>
                        </div>
                      </div>

                      <div className="px-5 py-3 border-t border-[#F0F4F0] dark:border-[#222B27] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSaved) {
                              onSaveImportedRecipe(r);
                              setSavedIds((prev) => ({ ...prev, [r.id]: true }));
                            }
                          }}
                          className="min-h-[44px] px-3.5 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]"
                        >
                          {isSaved ? <Check className="w-3.5 h-3.5 text-[#1B5E3F]" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{isSaved ? 'Saved Offline' : 'Save Offline'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!isSaved) {
                              onSaveImportedRecipe(r);
                              setSavedIds((prev) => ({ ...prev, [r.id]: true }));
                            }
                            setAssignTarget(r);
                            setAssignSlot(r.mealTypes[0] || 'dinner');
                          }}
                          className="min-h-[44px] px-4 rounded-lg bg-[#1B5E3F] text-white text-xs font-medium hover:bg-[#164C33]"
                        >
                          Save &amp; Add to Plan
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Assign Day + Slot Modal */}
      {assignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Schedule Recipe</p>
                <h3 className="font-display text-xl font-semibold">{assignTarget.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                aria-label="Close"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#55655D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={assignDay}
                onChange={(e) => setAssignDay(e.target.value as DayOfWeek)}
                className="min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={assignSlot}
                onChange={(e) => setAssignSlot(e.target.value as MealSlot)}
                className="min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm capitalize"
              >
                {MEAL_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                onAssignToPlan(assignTarget.id, assignDay, assignSlot);
                setAssignTarget(null);
              }}
              className="w-full min-h-[44px] rounded-lg bg-[#1B5E3F] text-white text-sm font-medium hover:bg-[#164C33]"
            >
              Confirm Meal Slot
            </button>
          </div>
        </div>
      )}

      {/* Custom Family Recipe Modal */}
      {showCustomForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateCustomRecipe}
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">Add Personal Family Recipe</h3>
              <button
                type="button"
                onClick={() => setShowCustomForm(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#55655D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Recipe Name</label>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Grandma's Okra Soup"
                className="w-full min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Cuisine</label>
              <select
                value={customCuisine}
                onChange={(e) => setCustomCuisine(e.target.value as CuisineRegion)}
                className="w-full min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm"
              >
                {ALL_CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Ingredients (one per line, e.g. "2 cups rice")
              </label>
              <textarea
                rows={4}
                value={customIngredientsText}
                onChange={(e) => setCustomIngredientsText(e.target.value)}
                placeholder={'2 cups rice\n1 lb chicken thighs\n2 whole onions'}
                className="w-full rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] p-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Steps (one per line)</label>
              <textarea
                rows={3}
                value={customInstructionsText}
                onChange={(e) => setCustomInstructionsText(e.target.value)}
                placeholder={'Season and sear chicken.\nSimmer with spices and serve warm.'}
                className="w-full rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] p-3 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-lg bg-[#1B5E3F] text-white text-sm font-medium hover:bg-[#164C33]"
            >
              Save to Offline Box
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
