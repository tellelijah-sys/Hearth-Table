import React, { useState } from 'react';
import { ExternalLink, Heart, MapPin, Plus, X } from 'lucide-react';
import type {
  DayOfWeek,
  MealPreferenceRecord,
  MealSlot,
  PantryItem,
  Recipe,
  RotationFrequency,
  TravelRegion,
} from '../types/meal';
import { DAYS_OF_WEEK, MEAL_SLOTS, formatQuantity, ingredientMatchesPantry } from '../utils/mealEngine';
import { RecipeThumbnail } from './RecipeThumbnail';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  householdSize: number;
  pantry: PantryItem[];
  mealPref?: MealPreferenceRecord;
  region: TravelRegion;
  onClose: () => void;
  onToggleLike: (recipeId: string) => void;
  onSetFrequency: (recipeId: string, frequency: RotationFrequency) => void;
  onAssignToPlan: (recipeId: string, day: DayOfWeek, slot: MealSlot) => void;
}

const FREQUENCY_OPTIONS: Array<{ value: RotationFrequency; label: string }> = [
  { value: 'weekly', label: 'Include weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Once a month' },
  { value: 'occasional', label: 'Occasionally' },
  { value: 'paused', label: 'Pause from plans' },
];

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  householdSize,
  pantry,
  mealPref,
  region,
  onClose,
  onToggleLike,
  onSetFrequency,
  onAssignToPlan,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('dinner');
  const [assignedFeedback, setAssignedFeedback] = useState(false);

  if (!recipe) return null;

  const scale = householdSize / (recipe.defaultServings || 4);
  const liked = mealPref?.liked ?? false;
  const frequency = mealPref?.frequency ?? 'occasional';
  const totalTime = recipe.prepMinutes + recipe.cookMinutes;

  const handleAssign = () => {
    onAssignToPlan(recipe.id, selectedDay, selectedSlot);
    setAssignedFeedback(true);
    setTimeout(() => setAssignedFeedback(false), 1800);
  };

  // Regional substitution tips relevant to this recipe
  const regionalSwaps = recipe.ingredients
    .map((ing) => {
      const lower = ing.name.toLowerCase();
      const hit = Object.entries(region.substitutionTips).find(([key]) =>
        lower.includes(key.toLowerCase())
      );
      return hit ? { ingredient: ing.name, swap: hit[1] } : null;
    })
    .filter((x): x is { ingredient: string; swap: string } => x !== null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-detail-title"
    >
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] shadow-2xl">
        <div className="relative">
          <RecipeThumbnail
            imageUrl={recipe.imageUrl}
            title={recipe.title}
            cuisine={recipe.cuisine}
            className="w-full h-52 sm:h-64"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recipe"
            className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-full bg-white/90 dark:bg-[#0F1412]/90 text-[#17211C] dark:text-[#ECF1EE] flex items-center justify-center shadow-md hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header & Unboxed Metadata */}
          <div>
            <p className="text-xs font-medium text-[#55655D] dark:text-[#A9B8B0]">
              {recipe.cuisine}
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="tabular-nums">{totalTime} min</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="capitalize">{recipe.budgetTier} budget</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{recipe.equipment.join(', ')}</span>
            </p>
            <h2
              id="recipe-detail-title"
              className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-[#17211C] dark:text-[#ECF1EE]"
            >
              {recipe.title}
            </h2>
            <p className="mt-2 text-sm text-[#55655D] dark:text-[#A9B8B0] leading-relaxed">
              {recipe.description}
            </p>
          </div>

          {/* Like & Schedule Frequency Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-[#E2E8E2] dark:border-[#242D29]">
            <button
              type="button"
              onClick={() => onToggleLike(recipe.id)}
              className={`min-h-[44px] px-4 py-2 rounded-lg border text-sm font-medium inline-flex items-center gap-2 transition-colors ${
                liked
                  ? 'border-[#1B5E3F] bg-[#1B5E3F]/10 text-[#1B5E3F] dark:border-[#6EE7B7] dark:text-[#6EE7B7]'
                  : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#17211C] dark:text-[#ECF1EE] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              <span>{liked ? 'Liked Meal' : 'Like Meal'}</span>
            </button>

            <div className="flex items-center gap-2">
              <label htmlFor="detail-freq" className="text-xs font-medium text-[#55655D] dark:text-[#A9B8B0]">
                Rotation:
              </label>
              <select
                id="detail-freq"
                value={frequency}
                onChange={(e) => onSetFrequency(recipe.id, e.target.value as RotationFrequency)}
                className="min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#111714] px-3 py-2 text-sm text-[#17211C] dark:text-[#ECF1EE]"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nutrition Strip */}
          <div className="grid grid-cols-4 gap-3 text-center py-3 px-4 rounded-xl bg-[#F2F5F2] dark:bg-[#111714]">
            <div>
              <p className="font-mono text-base font-medium tabular-nums text-[#17211C] dark:text-[#ECF1EE]">
                {recipe.calories}
              </p>
              <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">kcal</p>
            </div>
            <div>
              <p className="font-mono text-base font-medium tabular-nums text-[#17211C] dark:text-[#ECF1EE]">
                {recipe.proteinGrams}g
              </p>
              <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Protein</p>
            </div>
            <div>
              <p className="font-mono text-base font-medium tabular-nums text-[#17211C] dark:text-[#ECF1EE]">
                {recipe.carbsGrams}g
              </p>
              <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Carbs</p>
            </div>
            <div>
              <p className="font-mono text-base font-medium tabular-nums text-[#17211C] dark:text-[#ECF1EE]">
                {recipe.fiberGrams}g
              </p>
              <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Fiber</p>
            </div>
          </div>

          {/* Regional Travel Swap Callout */}
          {(regionalSwaps.length > 0 || recipe.regionalNotes) && (
            <div className="rounded-xl border border-[#E2E8E2] dark:border-[#242D29] bg-[#FAFBF9] dark:bg-[#111714] p-4 space-y-1.5">
              <p className="text-xs font-semibold text-[#1B5E3F] dark:text-[#6EE7B7] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Local Adaptation ({region.name})</span>
              </p>
              {recipe.regionalNotes && (
                <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">{recipe.regionalNotes}</p>
              )}
              {regionalSwaps.map((s) => (
                <p key={s.ingredient} className="text-xs text-[#55655D] dark:text-[#A9B8B0]">
                  Swap <strong className="text-[#17211C] dark:text-[#ECF1EE]">{s.ingredient}</strong> with{' '}
                  <strong className="text-[#17211C] dark:text-[#ECF1EE]">{s.swap}</strong>
                </p>
              ))}
            </div>
          )}

          {/* Ingredients Scaled for Household */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-display text-lg font-semibold text-[#17211C] dark:text-[#ECF1EE]">
                Ingredients
              </h3>
              <span className="text-xs text-[#55655D] dark:text-[#A9B8B0] tabular-nums">
                Scaled for {householdSize} {householdSize === 1 ? 'serving' : 'servings'}
              </span>
            </div>
            <ul className="divide-y divide-[#E2E8E2] dark:divide-[#242D29]">
              {recipe.ingredients.map((ing, idx) => {
                const inPantry = ingredientMatchesPantry(ing.name, pantry);
                const scaledQty = Math.round(ing.quantity * scale * 100) / 100;
                return (
                  <li key={`${ing.name}-${idx}`} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-mono tabular-nums font-medium text-[#17211C] dark:text-[#ECF1EE]">
                        {formatQuantity(scaledQty)} {ing.unit}
                      </span>{' '}
                      <span className="text-[#17211C] dark:text-[#ECF1EE]">{ing.name}</span>
                      {ing.substitutes && ing.substitutes.length > 0 && (
                        <span className="block text-xs text-[#55655D] dark:text-[#A9B8B0]">
                          Or use: {ing.substitutes.join(', ')}
                        </span>
                      )}
                    </div>
                    {inPantry ? (
                      <span className="text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7] whitespace-nowrap shrink-0">
                        In Pantry
                      </span>
                    ) : (
                      <span className="text-xs text-[#55655D] dark:text-[#A9B8B0] whitespace-nowrap shrink-0">
                        {ing.aisle}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="font-display text-lg font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-3">
              Preparation Steps
            </h3>
            <ol className="space-y-3">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-[#3F4E46] dark:text-[#CBD5CF] leading-relaxed">
                  <span className="font-mono text-xs tabular-nums font-semibold text-[#1B5E3F] dark:text-[#6EE7B7] pt-0.5">
                    0{i + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Online Sources if grounded */}
          {(recipe.sourceUrl || (recipe.sources && recipe.sources.length > 0)) && (
            <div className="pt-2 border-t border-[#E2E8E2] dark:border-[#242D29]">
              <p className="text-xs font-medium text-[#55655D] dark:text-[#A9B8B0] mb-2">
                Web Sources
              </p>
              <div className="flex flex-wrap gap-3">
                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#1B5E3F] dark:text-[#6EE7B7] hover:underline"
                  >
                    <span>Original Recipe</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {recipe.sources?.map((s) => (
                  <a
                    key={s.uri}
                    href={s.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#1B5E3F] dark:text-[#6EE7B7] hover:underline"
                  >
                    <span className="truncate max-w-[200px]">{s.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Add to Weekly Plan Bar */}
          <div className="rounded-xl border border-[#E2E8E2] dark:border-[#242D29] p-4 bg-[#FAFBF9] dark:bg-[#111714] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex flex-1 gap-2">
              <select
                aria-label="Select day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
                className="flex-1 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#171F1B] px-3 text-sm text-[#17211C] dark:text-[#ECF1EE]"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                aria-label="Select meal slot"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value as MealSlot)}
                className="flex-1 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#171F1B] px-3 text-sm text-[#17211C] dark:text-[#ECF1EE] capitalize"
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
              onClick={handleAssign}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[#1B5E3F] text-white text-sm font-medium hover:bg-[#164C33] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{assignedFeedback ? 'Added to Plan' : 'Add to Plan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
