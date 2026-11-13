import React, { useState } from 'react';
import { Globe, RefreshCw, Trash2, X } from 'lucide-react';
import type {
  DayOfWeek,
  MealPreferenceRecord,
  MealSlot,
  PantryItem,
  Recipe,
  TravelRegion,
  UserPreferences,
  WeeklyPlan,
} from '../types/meal';
import { getReplacementSuggestions } from '../utils/mealEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { RecipeThumbnail } from './RecipeThumbnail';

interface SwapMealModalProps {
  target: { day: DayOfWeek; slot: MealSlot; currentRecipe: Recipe | null } | null;
  weeklyPlan: WeeklyPlan;
  recipes: Recipe[];
  preferences: UserPreferences;
  pantry: PantryItem[];
  mealPreferences: Record<string, MealPreferenceRecord>;
  region: TravelRegion;
  onClose: () => void;
  onSelectReplacement: (day: DayOfWeek, slot: MealSlot, newRecipeId: string) => void;
  onRemoveMeal: (day: DayOfWeek, slot: MealSlot) => void;
  onAddOnlineRecipeAndAssign: (recipe: Recipe, day: DayOfWeek, slot: MealSlot) => void;
}

export const SwapMealModal: React.FC<SwapMealModalProps> = ({
  target,
  weeklyPlan,
  recipes,
  preferences,
  pantry,
  mealPreferences,
  region,
  onClose,
  onSelectReplacement,
  onRemoveMeal,
  onAddOnlineRecipeAndAssign,
}) => {
  const isOnline = useOnlineStatus();
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineRecipes, setOnlineRecipes] = useState<Recipe[]>([]);

  if (!target) return null;

  const offlineSuggestions = getReplacementSuggestions(
    target.slot,
    target.currentRecipe?.id ?? null,
    weeklyPlan,
    recipes,
    preferences,
    pantry,
    mealPreferences
  );

  const handleFetchOnlineReplacements = async () => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const excludeTitles = recipes
        .filter((r) => Object.values(weeklyPlan).some((d) => Object.values(d).includes(r.id)))
        .map((r) => r.title);

      const res = await fetch('/api/meals/smart-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot: target.slot,
          day: target.day,
          preferences,
          pantryItems: pantry.map((p) => p.name),
          excludeTitles,
          regionName: region.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not fetch online replacements.');

      const formatted: Recipe[] = (data.recipes || []).map((raw: Partial<Recipe>, idx: number) => ({
        id: `online-swap-${Date.now()}-${idx}`,
        title: raw.title || 'Online Suggestion',
        description: raw.description || '',
        cuisine: raw.cuisine || 'Mediterranean',
        mealTypes: raw.mealTypes?.length ? raw.mealTypes : [target.slot],
        prepMinutes: Number(raw.prepMinutes) || 15,
        cookMinutes: Number(raw.cookMinutes) || 20,
        defaultServings: Number(raw.defaultServings) || 4,
        budgetTier: raw.budgetTier || preferences.budgetTier,
        equipment: raw.equipment?.length ? raw.equipment : ['stovetop'],
        dietaryTags: raw.dietaryTags || [],
        nutritionGoals: raw.nutritionGoals || ['balanced'],
        palate: raw.palate || preferences.palate,
        kidFriendly: raw.kidFriendly ?? true,
        calories: Number(raw.calories) || 450,
        proteinGrams: Number(raw.proteinGrams) || 22,
        carbsGrams: Number(raw.carbsGrams) || 45,
        fatGrams: Number(raw.fatGrams) || 15,
        fiberGrams: Number(raw.fiberGrams) || 6,
        ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
        instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
        regionalNotes: raw.regionalNotes,
        imageUrl: typeof raw.imageUrl === 'string' && raw.imageUrl.trim() ? raw.imageUrl.trim() : undefined,
        sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : undefined,
        sources: data.sources || [],
        isCustomOrImported: true,
      }));
      setOnlineRecipes(formatted);
    } catch (err) {
      setOnlineError(err instanceof Error ? err.message : 'Unable to fetch online suggestions.');
    } finally {
      setOnlineLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-modal-title"
    >
      <div className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] p-6 shadow-2xl space-y-5">
        <div className="w-10 h-1.5 bg-[#D4DDD6] dark:bg-[#2F3B35] rounded-full mx-auto sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#55655D] dark:text-[#A9B8B0] capitalize">
              {target.day} · {target.slot}
            </p>
            <h2
              id="swap-modal-title"
              className="mt-0.5 font-display text-xl font-semibold text-[#17211C] dark:text-[#ECF1EE]"
            >
              {target.currentRecipe ? `Replace "${target.currentRecipe.title}"` : `Choose a ${target.slot} meal`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close replacement picker"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-lg text-[#55655D] hover:bg-[#F2F5F2] dark:hover:bg-[#222D28]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {target.currentRecipe && (
          <div className="flex items-center justify-between gap-3 py-2.5 px-3.5 rounded-xl bg-[#FAFBF9] dark:bg-[#111714] border border-[#E2E8E2] dark:border-[#242D29]">
            <span className="text-xs text-[#55655D] dark:text-[#A9B8B0]">
              Not cooking this slot or eating leftovers?
            </span>
            <button
              type="button"
              onClick={() => {
                onRemoveMeal(target.day, target.slot);
                onClose();
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium text-[#B91C1C] dark:text-[#FCA5A5] hover:bg-[#FEE2E2]/50 dark:hover:bg-[#7F1D1D]/30 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Meal</span>
            </button>
          </div>
        )}

        {/* Tailored Offline Replacement Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE]">
              Suggested for your taste, pantry &amp; filters
            </h3>
            <span className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Works offline</span>
          </div>
          <div className="divide-y divide-[#E2E8E2] dark:divide-[#242D29] border border-[#E2E8E2] dark:border-[#242D29] rounded-xl overflow-hidden">
            {offlineSuggestions.map(({ recipe, pantryPercent, missingIngredients, reasons }) => (
              <div
                key={recipe.id}
                className="p-3.5 bg-white dark:bg-[#171F1B] hover:bg-[#FAFBF9] dark:hover:bg-[#1C2621] flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <RecipeThumbnail
                    imageUrl={recipe.imageUrl}
                    title={recipe.title}
                    cuisine={recipe.cuisine}
                    compact
                    className="w-20 h-16 rounded-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[#17211C] dark:text-[#ECF1EE] truncate">
                      {recipe.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#55655D] dark:text-[#A9B8B0] truncate">
                      {recipe.cuisine} · {recipe.prepMinutes + recipe.cookMinutes}m · {pantryPercent}% pantry
                      {missingIngredients.length === 0 ? ' · 0 to buy' : ` · Buy ${missingIngredients.length}`}
                      {reasons.length > 0 ? ` · ${reasons[0]}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectReplacement(target.day, target.slot, recipe.id);
                    onClose();
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-[#1B5E3F] text-white text-xs font-medium hover:bg-[#164C33] transition-colors whitespace-nowrap shrink-0"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Online Discovery Replacements */}
        <div className="pt-2 border-t border-[#E2E8E2] dark:border-[#242D29]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE]">
                Want fresh online ideas?
              </p>
              <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">
                {isOnline
                  ? `Search web recipes matching your ${region.name} availability & pantry`
                  : 'Connect to the internet to source new recipes online'}
              </p>
            </div>
            <button
              type="button"
              disabled={!isOnline || onlineLoading}
              onClick={handleFetchOnlineReplacements}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-xs font-medium text-[#17211C] dark:text-[#ECF1EE] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {onlineLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-[#1B5E3F] dark:text-[#6EE7B7]" />
              )}
              <span>{onlineLoading ? 'Searching...' : 'Find Online'}</span>
            </button>
          </div>

          {onlineError && (
            <p className="mt-2 text-xs text-[#B91C1C] dark:text-[#FCA5A5]">{onlineError}</p>
          )}

          {onlineRecipes.length > 0 && (
            <div className="mt-3 divide-y divide-[#E2E8E2] dark:divide-[#242D29] border border-[#E2E8E2] dark:border-[#242D29] rounded-xl overflow-hidden">
              {onlineRecipes.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 bg-[#FAFBF9] dark:bg-[#111714] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <RecipeThumbnail
                      imageUrl={r.imageUrl}
                      title={r.title}
                      cuisine={r.cuisine}
                      compact
                      className="w-20 h-16 rounded-lg shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#17211C] dark:text-[#ECF1EE] truncate">
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#55655D] dark:text-[#A9B8B0] truncate">
                        {r.cuisine} · {r.prepMinutes + r.cookMinutes}m · Imported from web
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onAddOnlineRecipeAndAssign(r, target.day, target.slot);
                      onClose();
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-[#1B5E3F] text-white text-xs font-medium hover:bg-[#164C33] transition-colors whitespace-nowrap shrink-0"
                  >
                    Import &amp; Use
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
