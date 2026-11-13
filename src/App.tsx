import { useEffect, useMemo, useState } from 'react';
import { SEED_RECIPES } from './data/seedRecipes';
import { getRegionById } from './data/regions';
import type {
  CustomGroceryItem,
  DayOfWeek,
  GroceryAisle,
  MealPreferenceRecord,
  MealSlot,
  PantryItem,
  Recipe,
  RotationFrequency,
  UserPreferences,
  WeeklyPlan,
} from './types/meal';
import {
  buildSyncedGroceryList,
  createEmptyWeeklyPlan,
  generateSmartWeekPlan,
  normalizeIngredientName,
} from './utils/mealEngine';
import { loadPersistedState, savePersistedState } from './utils/storage';
import { Header, type AppTab } from './components/Header';
import { WeeklyPlanView } from './components/WeeklyPlanView';
import { DiscoverRecipesView } from './components/DiscoverRecipesView';
import { PantryView } from './components/PantryView';
import { GroceryListView } from './components/GroceryListView';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { SwapMealModal } from './components/SwapMealModal';
import { PreferencesModal } from './components/PreferencesModal';
import { OfflineIndicator } from './components/OfflineIndicator';

const DEFAULT_PREFERENCES: UserPreferences = {
  householdSize: 4,
  dietaryRestrictions: [],
  nutritionGoals: ['balanced'],
  equipment: ['stovetop', 'one-pot', 'oven', 'blender', 'no-cook'],
  budgetTier: 'moderate',
  palate: 'balanced',
  excludedIngredients: [],
  preferredCuisines: ['West African', 'Mediterranean', 'East Asian', 'South Asian'],
  activeSlots: ['breakfast', 'lunch', 'dinner'],
  regionId: 'global-home',
  theme: 'light',
};

const DEFAULT_PANTRY: PantryItem[] = [
  { id: 'p-1', name: 'long-grain rice', aisle: 'Grains & Bakery', useSoon: false, addedAt: 1 },
  { id: 'p-2', name: 'onions', aisle: 'Produce', useSoon: false, addedAt: 2 },
  { id: 'p-3', name: 'garlic', aisle: 'Produce', useSoon: false, addedAt: 3 },
  { id: 'p-4', name: 'eggs', aisle: 'Dairy & Eggs', useSoon: true, addedAt: 4 },
  { id: 'p-5', name: 'chickpeas', aisle: 'Canned & Dry Goods', useSoon: false, addedAt: 5 },
  { id: 'p-6', name: 'olive oil', aisle: 'Spices & Oils', useSoon: false, addedAt: 6 },
  { id: 'p-7', name: 'spinach', aisle: 'Produce', useSoon: true, addedAt: 7 },
  { id: 'p-8', name: 'rolled oats', aisle: 'Grains & Bakery', useSoon: false, addedAt: 8 },
];

const DEFAULT_MEAL_PREFS: Record<string, MealPreferenceRecord> = {
  'wa-jollof-chicken': { liked: true, frequency: 'weekly' },
  'med-lemon-chicken-chickpea': { liked: true, frequency: 'biweekly' },
  'ea-miso-noodle-bowl': { liked: true, frequency: 'weekly' },
};

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('plan');
  const [pantryOnlineSearchNonce, setPantryOnlineSearchNonce] = useState(0);

  const [recipes, setRecipes] = useState<Recipe[]>(SEED_RECIPES);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [pantry, setPantry] = useState<PantryItem[]>(DEFAULT_PANTRY);
  const [mealPreferences, setMealPreferences] =
    useState<Record<string, MealPreferenceRecord>>(DEFAULT_MEAL_PREFS);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan>(() =>
    generateSmartWeekPlan(SEED_RECIPES, DEFAULT_PREFERENCES, DEFAULT_PANTRY, DEFAULT_MEAL_PREFS)
  );
  const [checkedGroceries, setCheckedGroceries] = useState<Record<string, boolean>>({});
  const [customGroceries, setCustomGroceries] = useState<CustomGroceryItem[]>([]);

  // Modal state
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [swapTarget, setSwapTarget] = useState<{
    day: DayOfWeek;
    slot: MealSlot;
    currentRecipe: Recipe | null;
  } | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Hydrate offline DB on mount
  useEffect(() => {
    let active = true;
    loadPersistedState().then((saved) => {
      if (!active) return;
      if (saved) {
        if (saved.recipes?.length) {
          const savedIds = new Set(saved.recipes.map((r) => r.id));
          const missingSeeds = SEED_RECIPES.filter((s) => !savedIds.has(s.id));
          setRecipes([...saved.recipes, ...missingSeeds]);
        }
        if (saved.preferences) setPreferences({ ...DEFAULT_PREFERENCES, ...saved.preferences });
        if (saved.pantry) setPantry(saved.pantry);
        if (saved.mealPreferences) setMealPreferences(saved.mealPreferences);
        if (saved.weeklyPlan) setWeeklyPlan(saved.weeklyPlan);
        if (saved.checkedGroceries) setCheckedGroceries(saved.checkedGroceries);
        if (saved.customGroceries) setCustomGroceries(saved.customGroceries);
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    if (preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.theme]);

  // Persist offline state automatically
  useEffect(() => {
    if (!hydrated) return;
    savePersistedState({
      recipes,
      weeklyPlan,
      pantry,
      mealPreferences,
      checkedGroceries,
      customGroceries,
      preferences,
      updatedAt: Date.now(),
    });
  }, [
    hydrated,
    recipes,
    weeklyPlan,
    pantry,
    mealPreferences,
    checkedGroceries,
    customGroceries,
    preferences,
  ]);

  const region = useMemo(() => getRegionById(preferences.regionId), [preferences.regionId]);

  const groceryItems = useMemo(
    () =>
      buildSyncedGroceryList(
        weeklyPlan,
        recipes,
        pantry,
        preferences.householdSize,
        checkedGroceries
      ),
    [weeklyPlan, recipes, pantry, preferences.householdSize, checkedGroceries]
  );

  const groceryNeededCount = useMemo(
    () =>
      groceryItems.filter((i) => !i.inPantry && !i.checked).length +
      customGroceries.filter((c) => !c.checked).length,
    [groceryItems, customGroceries]
  );

  const handleToggleLike = (recipeId: string) => {
    setMealPreferences((prev) => {
      const curr = prev[recipeId] ?? { liked: false, frequency: 'occasional' as RotationFrequency };
      return {
        ...prev,
        [recipeId]: {
          ...curr,
          liked: !curr.liked,
          frequency: !curr.liked && curr.frequency === 'occasional' ? 'biweekly' : curr.frequency,
        },
      };
    });
  };

  const handleSetFrequency = (recipeId: string, frequency: RotationFrequency) => {
    setMealPreferences((prev) => {
      const curr = prev[recipeId] ?? { liked: false, frequency: 'occasional' as RotationFrequency };
      return {
        ...prev,
        [recipeId]: {
          ...curr,
          frequency,
        },
      };
    });
  };

  const handleAssignToPlan = (recipeId: string, day: DayOfWeek, slot: MealSlot) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: recipeId,
      },
    }));
  };

  const handleRemoveMeal = (day: DayOfWeek, slot: MealSlot) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: null,
      },
    }));
  };

  const handleAutoFillWeek = (
    preserveFilled: boolean,
    minimizeGroceries = false,
    pantryOnly = false
  ) => {
    setWeeklyPlan((prev) =>
      generateSmartWeekPlan(
        recipes,
        preferences,
        pantry,
        mealPreferences,
        preserveFilled ? prev : undefined,
        preserveFilled,
        minimizeGroceries,
        pantryOnly
      )
    );
  };

  const handleRefreshPlanPantryOnly = () => {
    handleAutoFillWeek(false, true, true);
  };

  const handleSaveImportedRecipe = (newRecipe: Recipe) => {
    setRecipes((prev) => {
      if (prev.some((r) => r.id === newRecipe.id)) return prev;
      return [newRecipe, ...prev];
    });
  };

  const handleAddOnlineAndAssign = (newRecipe: Recipe, day: DayOfWeek, slot: MealSlot) => {
    handleSaveImportedRecipe(newRecipe);
    handleAssignToPlan(newRecipe.id, day, slot);
  };

  const handleAddPantryItem = (
    name: string,
    aisle: GroceryAisle,
    useSoon: boolean,
    quantityNote?: string
  ) => {
    const norm = normalizeIngredientName(name);
    setPantry((prev) => {
      const existing = prev.find((p) => normalizeIngredientName(p.name) === norm);
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id
            ? { ...p, useSoon, quantityNote: quantityNote ?? p.quantityNote }
            : p
        );
      }
      return [
        {
          id: `pantry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          aisle,
          useSoon,
          quantityNote,
          addedAt: Date.now(),
        },
        ...prev,
      ];
    });
  };

  const handleMoveCheckedToPantry = () => {
    const boughtRecipeItems = groceryItems.filter((i) => !i.inPantry && i.checked);
    const boughtCustom = customGroceries.filter((c) => c.checked);

    for (const item of boughtRecipeItems) {
      handleAddPantryItem(item.name, item.aisle, false);
    }
    for (const c of boughtCustom) {
      handleAddPantryItem(c.name, c.aisle, false);
    }

    setCheckedGroceries({});
    setCustomGroceries((prev) => prev.filter((c) => !c.checked));
  };

  const handleExportBackup = () => {
    const payload = {
      recipes,
      weeklyPlan,
      pantry,
      mealPreferences,
      preferences,
      customGroceries,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hearth-table-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid backup');
    if (Array.isArray(parsed.recipes)) setRecipes(parsed.recipes);
    if (parsed.weeklyPlan) setWeeklyPlan(parsed.weeklyPlan);
    if (Array.isArray(parsed.pantry)) setPantry(parsed.pantry);
    if (parsed.mealPreferences) setMealPreferences(parsed.mealPreferences);
    if (parsed.preferences) setPreferences({ ...DEFAULT_PREFERENCES, ...parsed.preferences });
    if (Array.isArray(parsed.customGroceries)) setCustomGroceries(parsed.customGroceries);
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAFBF9] dark:bg-[#0F1412] text-[#17211C] dark:text-[#ECF1EE]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPreferences={() => setPrefsOpen(true)}
        groceryNeedCount={groceryNeededCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12">
        {activeTab === 'plan' && (
          <WeeklyPlanView
            weeklyPlan={weeklyPlan}
            recipes={recipes}
            pantry={pantry}
            preferences={preferences}
            mealPreferences={mealPreferences}
            region={region}
            groceryNeededCount={groceryNeededCount}
            onChangeRegion={(regionId) => setPreferences((p) => ({ ...p, regionId }))}
            onAutoFillWeek={handleAutoFillWeek}
            onRefreshPantryOnly={handleRefreshPlanPantryOnly}
            onClearWeek={() => setWeeklyPlan(createEmptyWeeklyPlan())}
            onOpenRecipe={setDetailRecipe}
            onOpenSwap={(day, slot, currentRecipe) =>
              setSwapTarget({ day, slot, currentRecipe })
            }
            onRemoveMeal={handleRemoveMeal}
            onToggleLike={handleToggleLike}
            onSetFrequency={handleSetFrequency}
            onGoToGroceries={() => setActiveTab('groceries')}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverRecipesView
            recipes={recipes}
            pantry={pantry}
            preferences={preferences}
            mealPreferences={mealPreferences}
            region={region}
            pantryOnlineSearchNonce={pantryOnlineSearchNonce}
            onOpenRecipe={setDetailRecipe}
            onToggleLike={handleToggleLike}
            onSetFrequency={handleSetFrequency}
            onSaveImportedRecipe={handleSaveImportedRecipe}
            onAssignToPlan={handleAssignToPlan}
          />
        )}

        {activeTab === 'pantry' && (
          <PantryView
            pantry={pantry}
            recipes={recipes}
            preferences={preferences}
            mealPreferences={mealPreferences}
            onAddPantryItem={handleAddPantryItem}
            onRemovePantryItem={(id) => setPantry((prev) => prev.filter((p) => p.id !== id))}
            onClearPantry={() => setPantry([])}
            onToggleUseSoon={(id) =>
              setPantry((prev) =>
                prev.map((p) => (p.id === id ? { ...p, useSoon: !p.useSoon } : p))
              )
            }
            onOpenRecipe={setDetailRecipe}
            onAssignToPlan={handleAssignToPlan}
            onGeneratePantryFirstPlan={() => {
              handleAutoFillWeek(false, true, false);
              setActiveTab('plan');
            }}
            onRefreshPlanPantryOnly={() => {
              handleRefreshPlanPantryOnly();
              setActiveTab('plan');
            }}
            onSearchOnlineWithPantry={() => {
              setPantryOnlineSearchNonce((n) => n + 1);
              setActiveTab('discover');
            }}
          />
        )}

        {activeTab === 'groceries' && (
          <GroceryListView
            items={groceryItems}
            customItems={customGroceries}
            householdSize={preferences.householdSize}
            region={region}
            onToggleChecked={(key) =>
              setCheckedGroceries((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            onToggleCustomChecked={(id) =>
              setCustomGroceries((prev) =>
                prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
              )
            }
            onAddCustomItem={(name, quantityText, aisle) =>
              setCustomGroceries((prev) => [
                {
                  id: `cg-${Date.now()}`,
                  name,
                  quantityText,
                  aisle,
                  checked: false,
                },
                ...prev,
              ])
            }
            onRemoveCustomItem={(id) =>
              setCustomGroceries((prev) => prev.filter((c) => c.id !== id))
            }
            onMoveCheckedToPantry={handleMoveCheckedToPantry}
            onClearChecked={() => {
              setCheckedGroceries({});
              setCustomGroceries((prev) => prev.map((c) => ({ ...c, checked: false })));
            }}
          />
        )}
      </main>

      <footer className="hidden md:block border-t border-[#E2E8E2] dark:border-[#242D29] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-[#55655D] dark:text-[#A9B8B0]">
          <span>Hearth &amp; Table — Offline-first family meal &amp; grocery planner</span>
          <span>Works offline on iOS, Android &amp; Desktop</span>
        </div>
      </footer>

      <OfflineIndicator />

      <RecipeDetailModal
        recipe={detailRecipe}
        householdSize={preferences.householdSize}
        pantry={pantry}
        mealPref={detailRecipe ? mealPreferences[detailRecipe.id] : undefined}
        region={region}
        onClose={() => setDetailRecipe(null)}
        onToggleLike={handleToggleLike}
        onSetFrequency={handleSetFrequency}
        onAssignToPlan={handleAssignToPlan}
      />

      <SwapMealModal
        target={swapTarget}
        weeklyPlan={weeklyPlan}
        recipes={recipes}
        preferences={preferences}
        pantry={pantry}
        mealPreferences={mealPreferences}
        region={region}
        onClose={() => setSwapTarget(null)}
        onSelectReplacement={(day, slot, newRecipeId) => handleAssignToPlan(newRecipeId, day, slot)}
        onRemoveMeal={handleRemoveMeal}
        onAddOnlineRecipeAndAssign={handleAddOnlineAndAssign}
      />

      <PreferencesModal
        open={prefsOpen}
        preferences={preferences}
        onClose={() => setPrefsOpen(false)}
        onChangePreferences={setPreferences}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />
    </div>
  );
}
