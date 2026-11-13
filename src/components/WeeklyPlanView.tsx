import React, { useState } from 'react';
import {
  ArrowLeftRight,
  CalendarPlus,
  Heart,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import heroTableImg from '../assets/images/hero_family_table_1794593172544.jpg';
import type {
  DayOfWeek,
  MealPreferenceRecord,
  MealSlot,
  PantryItem,
  Recipe,
  RotationFrequency,
  TravelRegion,
  UserPreferences,
  WeeklyPlan,
} from '../types/meal';
import { DAYS_OF_WEEK, scoreRecipeForUser } from '../utils/mealEngine';
import { TRAVEL_REGIONS } from '../data/regions';
import { PWAInstallButton } from './PWAInstallButton';
import { RecipeThumbnail } from './RecipeThumbnail';

interface WeeklyPlanViewProps {
  weeklyPlan: WeeklyPlan;
  recipes: Recipe[];
  pantry: PantryItem[];
  preferences: UserPreferences;
  mealPreferences: Record<string, MealPreferenceRecord>;
  region: TravelRegion;
  groceryNeededCount: number;
  onChangeRegion: (regionId: string) => void;
  onAutoFillWeek: (preserveFilled: boolean, minimizeGroceries?: boolean) => void;
  onRefreshPantryOnly: () => void;
  onClearWeek: () => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onOpenSwap: (day: DayOfWeek, slot: MealSlot, currentRecipe: Recipe | null) => void;
  onRemoveMeal: (day: DayOfWeek, slot: MealSlot) => void;
  onToggleLike: (recipeId: string) => void;
  onSetFrequency: (recipeId: string, freq: RotationFrequency) => void;
  onGoToGroceries: () => void;
}

const SHORT_DAYS: Record<DayOfWeek, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({
  weeklyPlan,
  recipes,
  pantry,
  preferences,
  mealPreferences,
  region,
  groceryNeededCount,
  onChangeRegion,
  onAutoFillWeek,
  onRefreshPantryOnly,
  onClearWeek,
  onOpenRecipe,
  onOpenSwap,
  onRemoveMeal,
  onToggleLike,
  onSetFrequency,
  onGoToGroceries,
}) => {
  const [mobileDay, setMobileDay] = useState<DayOfWeek>('Monday');
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const activeSlots = preferences.activeSlots.length
    ? preferences.activeSlots
    : (['breakfast', 'lunch', 'dinner'] as MealSlot[]);

  let plannedCount = 0;
  let totalIngredients = 0;
  let pantryCoveredIngredients = 0;

  for (const day of DAYS_OF_WEEK) {
    for (const slot of activeSlots) {
      const id = weeklyPlan[day][slot];
      const rec = id ? recipeMap.get(id) : undefined;
      if (rec) {
        plannedCount++;
        const scored = scoreRecipeForUser(rec, preferences, pantry, mealPreferences);
        totalIngredients += scored.pantryTotal;
        pantryCoveredIngredients += scored.pantryMatches;
      }
    }
  }

  const totalSlots = DAYS_OF_WEEK.length * activeSlots.length;
  const pantryCoveragePct =
    totalIngredients > 0 ? Math.round((pantryCoveredIngredients / totalIngredients) * 100) : 0;

  const renderSlotCard = (day: DayOfWeek, slot: MealSlot) => {
    const recipeId = weeklyPlan[day][slot];
    const recipe = recipeId ? recipeMap.get(recipeId) ?? null : null;

    if (!recipe) {
      return (
        <div
          key={`${day}-${slot}`}
          className="rounded-xl border border-dashed border-[#D4DDD6] dark:border-[#2B3731] p-4 flex items-center justify-between gap-3 bg-[#FAFBF9]/60 dark:bg-[#111714]/60"
        >
          <div>
            <p className="text-xs font-medium text-[#55655D] dark:text-[#A9B8B0] capitalize">
              {slot}
            </p>
            <p className="text-sm text-[#55655D] dark:text-[#A9B8B0] mt-0.5">No meal planned</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenSwap(day, slot, null)}
            className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#171F1B] text-xs font-medium text-[#17211C] dark:text-[#ECF1EE] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Meal</span>
          </button>
        </div>
      );
    }

    const scoreInfo = scoreRecipeForUser(recipe, preferences, pantry, mealPreferences);
    const pref = mealPreferences[recipe.id];
    const liked = pref?.liked ?? false;
    const frequency = pref?.frequency ?? 'occasional';
    const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

    return (
      <div
        key={`${day}-${slot}`}
        className="rounded-xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-4 flex flex-col justify-between gap-3 transition-colors hover:border-[#BFD0C5] dark:hover:border-[#34453C]"
      >
        <div>
          <button
            type="button"
            onClick={() => onOpenRecipe(recipe)}
            className="block w-full mb-3 rounded-lg overflow-hidden"
          >
            <RecipeThumbnail
              imageUrl={recipe.imageUrl}
              title={recipe.title}
              cuisine={recipe.cuisine}
              compact
              className="w-full h-28"
            />
          </button>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#55655D] dark:text-[#A9B8B0] capitalize">
              {slot} · {recipe.cuisine} · <span className="tabular-nums">{totalMinutes}m</span>
            </span>
            <button
              type="button"
              onClick={() => onToggleLike(recipe.id)}
              aria-label={liked ? `Unlike ${recipe.title}` : `Like ${recipe.title}`}
              className="min-h-[44px] min-w-[44px] -mr-2 -my-2 flex items-center justify-center rounded-lg text-[#55655D] hover:text-[#1B5E3F] dark:hover:text-[#6EE7B7]"
            >
              <Heart
                className={`w-4 h-4 ${
                  liked ? 'fill-[#1B5E3F] text-[#1B5E3F] dark:fill-[#6EE7B7] dark:text-[#6EE7B7]' : ''
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenRecipe(recipe)}
            className="mt-1 text-left font-display text-base font-semibold text-[#17211C] dark:text-[#ECF1EE] hover:text-[#1B5E3F] dark:hover:text-[#6EE7B7] transition-colors line-clamp-2"
          >
            {recipe.title}
          </button>

          <p className="mt-1 text-xs text-[#55655D] dark:text-[#A9B8B0] tabular-nums">
            {scoreInfo.pantryMatches}/{scoreInfo.pantryTotal} in pantry ·{' '}
            {scoreInfo.missingIngredients.length === 0
              ? 'Ready to cook'
              : `Buy ${scoreInfo.missingIngredients.length}`}
            {scoreInfo.usesSoonCount > 0 ? ` · Uses ${scoreInfo.usesSoonCount} expiring` : ''}
          </p>
        </div>

        <div className="pt-2.5 border-t border-[#F0F4F0] dark:border-[#222B27] flex items-center justify-between gap-2">
          <select
            aria-label={`Schedule frequency for ${recipe.title}`}
            value={frequency}
            onChange={(e) => onSetFrequency(recipe.id, e.target.value as RotationFrequency)}
            className="min-h-[40px] rounded-md border border-[#E2E8E2] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-2 text-xs text-[#3F4E46] dark:text-[#A9B8B0]"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="occasional">Occasional</option>
            <option value="paused">Pause</option>
          </select>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenSwap(day, slot, recipe)}
              aria-label={`Swap ${recipe.title}`}
              className="min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Swap</span>
            </button>
            <button
              type="button"
              onClick={() => onRemoveMeal(day, slot)}
              aria-label={`Remove ${recipe.title}`}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#55655D] hover:text-[#B91C1C] hover:bg-[#FEE2E2]/40 dark:hover:text-[#FCA5A5] dark:hover:bg-[#7F1D1D]/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Editorial Hero Split */}
      <section className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#55655D] dark:text-[#A9B8B0] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#1B5E3F] dark:text-[#6EE7B7]" />
                  <span>Cooking Region:</span>
                  <select
                    aria-label="Current cooking region"
                    value={region.id}
                    onChange={(e) => onChangeRegion(e.target.value)}
                    className="bg-transparent font-semibold text-[#17211C] dark:text-[#ECF1EE] underline decoration-[#D4DDD6] underline-offset-4 cursor-pointer"
                  >
                    {TRAVEL_REGIONS.map((r) => (
                      <option key={r.id} value={r.id} className="bg-white dark:bg-[#171F1B]">
                        {r.name}
                      </option>
                    ))}
                  </select>
                </p>
                <PWAInstallButton compact />
              </div>

              <h1
                className="mt-4 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#17211C] dark:text-[#ECF1EE] max-w-xl"
                style={{ textWrap: 'balance' }}
              >
                Calm weekly meal planning, rooted in your pantry and culture.
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#55655D] dark:text-[#A9B8B0] max-w-xl leading-relaxed">
                Plan meals that fit your household palate, budget, and kitchen tools—whether cooking at home or shopping local markets abroad.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onAutoFillWeek(false, false)}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#1B5E3F] text-white text-sm font-medium hover:bg-[#164C33] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Smart-Plan Full Week</span>
              </button>

              <button
                type="button"
                disabled={pantry.length === 0}
                onClick={onRefreshPantryOnly}
                className="min-h-[44px] px-4 py-2.5 rounded-lg border border-[#1B5E3F]/35 dark:border-[#6EE7B7]/35 bg-[#1B5E3F]/5 dark:bg-[#6EE7B7]/10 text-sm font-medium text-[#1B5E3F] dark:text-[#6EE7B7] hover:bg-[#1B5E3F]/10 disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Package className="w-4 h-4" />
                <span>Refresh: Pantry Only</span>
              </button>

              <button
                type="button"
                onClick={() => onAutoFillWeek(true, false)}
                className="min-h-[44px] px-4 py-2.5 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-sm font-medium text-[#17211C] dark:text-[#ECF1EE] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] whitespace-nowrap shrink-0"
              >
                Fill Empty Slots
              </button>

              <button
                type="button"
                onClick={onClearWeek}
                className="min-h-[44px] px-3 py-2 text-xs font-medium text-[#55655D] dark:text-[#A9B8B0] hover:text-[#17211C] dark:hover:text-[#ECF1EE] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Week</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 min-h-[220px] lg:min-h-full relative bg-[#F2F5F2] dark:bg-[#111714]">
            <img
              src={heroTableImg}
              alt="Fresh family dishes laid out on a natural linen table"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
          </div>
        </div>

        {/* Full-Width 4-Column Summary Strip below Hero */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8E2] dark:divide-[#242D29] border-t border-[#E2E8E2] dark:border-[#242D29] bg-[#FAFBF9] dark:bg-[#121815]">
          <div className="p-4 sm:px-6">
            <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Meals Scheduled</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#17211C] dark:text-[#ECF1EE]">
              {plannedCount} / {totalSlots}
            </p>
          </div>
          <div className="p-4 sm:px-6">
            <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Pantry Coverage</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#1B5E3F] dark:text-[#6EE7B7]">
              {pantryCoveragePct}%
            </p>
          </div>
          <div className="p-4 sm:px-6">
            <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Household Size</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#17211C] dark:text-[#ECF1EE]">
              {preferences.householdSize} servings
            </p>
          </div>
          <div className="p-4 sm:px-6 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">Groceries To Buy</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#17211C] dark:text-[#ECF1EE]">
                {groceryNeededCount} items
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToGroceries}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#171F1B] text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7] hover:bg-[#F2F5F2] whitespace-nowrap shrink-0"
            >
              View List
            </button>
          </div>
        </div>
      </section>

      {/* Mobile Day Selector (Thumb-friendly horizontal scroller) */}
      <div className="md:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2" role="tablist" aria-label="Days of week">
          {DAYS_OF_WEEK.map((day) => {
            const active = mobileDay === day;
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMobileDay(day)}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#1B5E3F] text-white'
                    : 'bg-white dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] text-[#55655D] dark:text-[#A9B8B0]'
                }`}
              >
                {SHORT_DAYS[day]}
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#17211C] dark:text-[#ECF1EE]">
            {mobileDay}
          </h2>
          {activeSlots.map((slot) => renderSlotCard(mobileDay, slot))}
        </div>
      </div>

      {/* Desktop 7-Day Planner Grid */}
      <section className="hidden md:block space-y-6" aria-label="Weekly meal schedule">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="border-b border-[#E2E8E2] dark:border-[#242D29] pb-6 last:border-b-0"
          >
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl font-semibold text-[#17211C] dark:text-[#ECF1EE]">
                {day}
              </h2>
              <span className="text-xs text-[#55655D] dark:text-[#A9B8B0] tabular-nums">
                {activeSlots.filter((s) => !!weeklyPlan[day][s]).length} of {activeSlots.length} planned
              </span>
            </div>

            <div
              className={`grid gap-4 ${
                activeSlots.length === 1
                  ? 'grid-cols-1 max-w-md'
                  : activeSlots.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
              }`}
            >
              {activeSlots.map((slot) => renderSlotCard(day, slot))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
