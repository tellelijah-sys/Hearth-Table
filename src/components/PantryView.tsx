import React, { useMemo, useState } from 'react';
import { CalendarPlus, Clock, Globe, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type {
  DayOfWeek,
  GroceryAisle,
  MealPreferenceRecord,
  MealSlot,
  PantryItem,
  Recipe,
  UserPreferences,
} from '../types/meal';
import { DAYS_OF_WEEK, MEAL_SLOTS, normalizeIngredientName, scoreRecipeForUser } from '../utils/mealEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { RecipeThumbnail } from './RecipeThumbnail';

interface PantryViewProps {
  pantry: PantryItem[];
  recipes: Recipe[];
  preferences: UserPreferences;
  mealPreferences: Record<string, MealPreferenceRecord>;
  onAddPantryItem: (name: string, aisle: GroceryAisle, useSoon: boolean, quantityNote?: string) => void;
  onRemovePantryItem: (id: string) => void;
  onClearPantry: () => void;
  onToggleUseSoon: (id: string) => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onAssignToPlan: (recipeId: string, day: DayOfWeek, slot: MealSlot) => void;
  onGeneratePantryFirstPlan: () => void;
  onRefreshPlanPantryOnly: () => void;
  onSearchOnlineWithPantry: () => void;
}

const AISLES: GroceryAisle[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Grains & Bakery',
  'Canned & Dry Goods',
  'Spices & Oils',
  'Frozen & Other',
];

const QUICK_STAPLES: Array<{ name: string; aisle: GroceryAisle }> = [
  { name: 'rice', aisle: 'Grains & Bakery' },
  { name: 'onions', aisle: 'Produce' },
  { name: 'tomatoes', aisle: 'Produce' },
  { name: 'garlic', aisle: 'Produce' },
  { name: 'eggs', aisle: 'Dairy & Eggs' },
  { name: 'rolled oats', aisle: 'Grains & Bakery' },
  { name: 'chickpeas', aisle: 'Canned & Dry Goods' },
  { name: 'lentils', aisle: 'Canned & Dry Goods' },
  { name: 'chicken thighs', aisle: 'Meat & Seafood' },
  { name: 'spinach', aisle: 'Produce' },
  { name: 'olive oil', aisle: 'Spices & Oils' },
  { name: 'plantains', aisle: 'Produce' },
  { name: 'tofu', aisle: 'Produce' },
  { name: 'coconut milk', aisle: 'Canned & Dry Goods' },
  { name: 'sweet potatoes', aisle: 'Produce' },
  { name: 'soy sauce', aisle: 'Spices & Oils' },
  { name: 'bell peppers', aisle: 'Produce' },
  { name: 'tortillas', aisle: 'Grains & Bakery' },
];

export const PantryView: React.FC<PantryViewProps> = ({
  pantry,
  recipes,
  preferences,
  mealPreferences,
  onAddPantryItem,
  onRemovePantryItem,
  onClearPantry,
  onToggleUseSoon,
  onOpenRecipe,
  onAssignToPlan,
  onGeneratePantryFirstPlan,
  onRefreshPlanPantryOnly,
  onSearchOnlineWithPantry,
}) => {
  const isOnline = useOnlineStatus();
  const [name, setName] = useState('');
  const [quantityNote, setQuantityNote] = useState('');
  const [aisle, setAisle] = useState<GroceryAisle>('Produce');
  const [useSoon, setUseSoon] = useState(false);
  const [assignRecipe, setAssignRecipe] = useState<Recipe | null>(null);
  const [assignDay, setAssignDay] = useState<DayOfWeek>('Monday');
  const [assignSlot, setAssignSlot] = useState<MealSlot>('dinner');
  const [planNotice, setPlanNotice] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const pantryMatches = useMemo(() => {
    return recipes
      .map((r) => scoreRecipeForUser(r, preferences, pantry, mealPreferences, true))
      .filter((s) => s.fitsDietary && s.fitsExclusions && s.pantryMatches > 0)
      .sort((a, b) => {
        if (b.usesSoonCount !== a.usesSoonCount) return b.usesSoonCount - a.usesSoonCount;
        if (b.pantryPercent !== a.pantryPercent) return b.pantryPercent - a.pantryPercent;
        if (a.missingIngredients.length !== b.missingIngredients.length) {
          return a.missingIngredients.length - b.missingIngredients.length;
        }
        return b.score - a.score;
      })
      .slice(0, 10);
  }, [recipes, preferences, pantry, mealPreferences]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    // Support comma-separated batch additions (e.g., "rice, onions, eggs")
    const entries = name
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const entry of entries) {
      onAddPantryItem(entry, aisle, useSoon, entries.length === 1 ? quantityNote.trim() || undefined : undefined);
    }
    setName('');
    setQuantityNote('');
    setUseSoon(false);
  };

  const hasStaple = (stapleName: string) =>
    pantry.some((p) => normalizeIngredientName(p.name) === normalizeIngredientName(stapleName));

  const toggleStaple = (staple: { name: string; aisle: GroceryAisle }) => {
    const existing = pantry.find(
      (p) => normalizeIngredientName(p.name) === normalizeIngredientName(staple.name)
    );
    if (existing) {
      onRemovePantryItem(existing.id);
    } else {
      onAddPantryItem(staple.name, staple.aisle, false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#17211C] dark:text-[#ECF1EE]">
            My Kitchen Pantry
          </h1>
          <p className="mt-1 text-sm text-[#55655D] dark:text-[#A9B8B0] max-w-2xl">
            List what you already have on hand. We suggest meals and full weekly plans that primarily use your available ingredients—minimizing new grocery purchases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={pantry.length === 0}
            onClick={() => {
              onRefreshPlanPantryOnly();
              setPlanNotice(true);
              setTimeout(() => setPlanNotice(false), 2500);
            }}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[#1B5E3F] text-white text-xs sm:text-sm font-medium hover:bg-[#164C33] disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{planNotice ? 'Plan Refreshed!' : 'Refresh Plan (Pantry Only)'}</span>
          </button>

          <button
            type="button"
            disabled={pantry.length === 0}
            onClick={onGeneratePantryFirstPlan}
            className="min-h-[44px] px-4 py-2 rounded-lg border border-[#1B5E3F]/35 dark:border-[#6EE7B7]/35 bg-[#1B5E3F]/5 dark:bg-[#6EE7B7]/10 text-xs sm:text-sm font-medium text-[#1B5E3F] dark:text-[#6EE7B7] hover:bg-[#1B5E3F]/10 disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Build Pantry-First Week</span>
          </button>

          <button
            type="button"
            disabled={!isOnline || pantry.length === 0}
            onClick={onSearchOnlineWithPantry}
            className="min-h-[44px] px-4 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#171F1B] text-xs sm:text-sm font-medium text-[#17211C] dark:text-[#ECF1EE] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Globe className="w-4 h-4 text-[#1B5E3F] dark:text-[#6EE7B7]" />
            <span>Search Online With Pantry</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add & Manage Pantry */}
        <div className="lg:col-span-6 space-y-6">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-5 space-y-4"
          >
            <div>
              <h2 className="font-display text-lg font-semibold">Add Ingredients On Hand</h2>
              <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">
                Enter one item or several separated by commas (e.g., rice, onions, eggs).
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. rice, onions, okra, yogurt..."
                className="flex-1 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3.5 text-sm"
              />
              <input
                type="text"
                value={quantityNote}
                onChange={(e) => setQuantityNote(e.target.value)}
                placeholder="Qty (opt.)"
                className="sm:w-28 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <select
                  value={aisle}
                  onChange={(e) => setAisle(e.target.value as GroceryAisle)}
                  className="min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm"
                >
                  {AISLES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-2 text-xs text-[#55655D] dark:text-[#A9B8B0] cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={useSoon}
                    onChange={(e) => setUseSoon(e.target.checked)}
                    className="w-4 h-4 accent-[#B45309]"
                  />
                  <span>Use Soon</span>
                </label>
              </div>
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-lg bg-[#1B5E3F] text-white text-sm font-medium hover:bg-[#164C33] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Pantry</span>
              </button>
            </div>
          </form>

          {/* One-Tap Global Staples */}
          <div className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-5">
            <h2 className="font-display text-lg font-semibold">Quick-Toggle Pantry Staples</h2>
            <p className="text-xs text-[#55655D] dark:text-[#A9B8B0] mt-0.5 mb-3">
              Tap everyday items you currently have in your kitchen.
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_STAPLES.map((st) => {
                const active = hasStaple(st.name);
                return (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => toggleStaple(st)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${
                      active
                        ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                        : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#3F4E46] dark:text-[#A9B8B0] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]'
                    }`}
                  >
                    {st.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Pantry Inventory List */}
          <div className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8E2] dark:border-[#242D29] flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">
                In Your Kitchen ({pantry.length})
              </h2>

              {pantry.length > 0 && (
                <div className="flex items-center gap-2">
                  {confirmClear ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onClearPantry();
                          setConfirmClear(false);
                        }}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-medium hover:bg-[#991B1B] whitespace-nowrap shrink-0"
                      >
                        Confirm Clear All
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-xs font-medium text-[#55655D] dark:text-[#A9B8B0] whitespace-nowrap shrink-0"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#E2E8E2] dark:border-[#2B3731] text-xs font-medium text-[#B91C1C] dark:text-[#FCA5A5] hover:bg-[#FEE2E2]/40 dark:hover:bg-[#7F1D1D]/20 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Pantry</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {pantry.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#55655D] dark:text-[#A9B8B0]">
                Your pantry is empty. Add ingredients above or tap quick staples to rebuild your inventory, then refresh your meal plan.
              </div>
            ) : (
              <ul className="divide-y divide-[#E2E8E2] dark:divide-[#242D29]">
                {pantry.map((item) => (
                  <li
                    key={item.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 min-h-[56px]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize text-[#17211C] dark:text-[#ECF1EE] truncate">
                        {item.name}
                        {item.quantityNote ? (
                          <span className="ml-2 font-mono text-xs text-[#55655D] dark:text-[#A9B8B0]">
                            ({item.quantityNote})
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[#55655D] dark:text-[#A9B8B0]">
                        {item.aisle}
                        {item.useSoon ? ' · Use Soon' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleUseSoon(item.id)}
                        className={`min-h-[40px] px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-colors ${
                          item.useSoon
                            ? 'border-[#B45309]/40 bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2111] dark:text-[#FCD34D]'
                            : 'border-[#E2E8E2] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Use Soon</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemovePantryItem(item.id)}
                        aria-label={`Remove ${item.name} from pantry`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#55655D] hover:text-[#B91C1C] hover:bg-[#FEE2E2]/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Cook With What You Have Suggestions */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-5">
            <h2 className="font-display text-lg font-semibold">
              Menus Using Your Available Ingredients
            </h2>
            <p className="text-xs text-[#55655D] dark:text-[#A9B8B0] mt-0.5 mb-4">
              Ranked to minimize new grocery purchases and prioritize items marked Use Soon.
            </p>

            {pantryMatches.length === 0 ? (
              <p className="text-sm text-[#55655D] dark:text-[#A9B8B0]">
                Add a few pantry ingredients to unlock tailored meal matches.
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8E2] dark:divide-[#242D29]">
                {pantryMatches.map(
                  ({
                    recipe,
                    pantryMatches: hits,
                    pantryTotal,
                    pantryPercent,
                    missingIngredients,
                    usesSoonCount,
                  }) => (
                    <div
                      key={recipe.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <RecipeThumbnail
                          imageUrl={recipe.imageUrl}
                          title={recipe.title}
                          cuisine={recipe.cuisine}
                          compact
                          className="w-20 h-16 rounded-lg shrink-0"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpenRecipe(recipe)}
                            className="text-left font-medium text-sm text-[#17211C] dark:text-[#ECF1EE] hover:text-[#1B5E3F] dark:hover:text-[#6EE7B7]"
                          >
                            {recipe.title}
                          </button>
                          <p className="mt-0.5 text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7] tabular-nums">
                            {hits}/{pantryTotal} in pantry ({pantryPercent}%)
                            {usesSoonCount > 0 ? ` · Uses ${usesSoonCount} expiring` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-[#55655D] dark:text-[#A9B8B0] truncate">
                            {missingIngredients.length === 0
                              ? 'All ingredients on hand — 0 new items needed'
                              : `Need (${missingIngredients.length}): ${missingIngredients.slice(0, 3).join(', ')}${
                                  missingIngredients.length > 3 ? '...' : ''
                                }`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignRecipe(recipe);
                          setAssignSlot(recipe.mealTypes[0] || 'dinner');
                        }}
                        className="min-h-[40px] px-3 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] whitespace-nowrap shrink-0"
                      >
                        Plan
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Pantry Match to Plan */}
      {assignRecipe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] p-6 space-y-4">
            <h3 className="font-display text-xl font-semibold">Add {assignRecipe.title}</h3>
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignRecipe(null)}
                className="flex-1 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onAssignToPlan(assignRecipe.id, assignDay, assignSlot);
                  setAssignRecipe(null);
                }}
                className="flex-1 min-h-[44px] rounded-lg bg-[#1B5E3F] text-white text-sm font-medium"
              >
                Add to Week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
