import React, { useRef, useState } from 'react';
import { Download, Moon, Sun, Upload, X } from 'lucide-react';
import type {
  BudgetTier,
  CuisineRegion,
  DietaryTag,
  EquipmentType,
  MealSlot,
  NutritionGoal,
  PalateStyle,
  UserPreferences,
} from '../types/meal';
import { TRAVEL_REGIONS } from '../data/regions';
import { PWAInstallButton } from './PWAInstallButton';

interface PreferencesModalProps {
  open: boolean;
  preferences: UserPreferences;
  onClose: () => void;
  onChangePreferences: (next: UserPreferences) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<void>;
}

const DIETARY_OPTIONS: Array<{ value: DietaryTag; label: string }> = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'gluten-free', label: 'Gluten-Free' },
  { value: 'dairy-free', label: 'Dairy-Free' },
  { value: 'nut-free', label: 'Nut-Free' },
  { value: 'pescatarian', label: 'Pescatarian' },
];

const NUTRITION_OPTIONS: Array<{ value: NutritionGoal; label: string }> = [
  { value: 'balanced', label: 'Balanced Family' },
  { value: 'high-protein', label: 'High Protein' },
  { value: 'high-fiber', label: 'High Fiber' },
  { value: 'heart-healthy', label: 'Heart Healthy' },
  { value: 'low-carb', label: 'Low Carb' },
  { value: 'calorie-conscious', label: 'Calorie Conscious' },
  { value: 'kid-friendly', label: 'Kid-Friendly' },
];

const EQUIPMENT_OPTIONS: Array<{ value: EquipmentType; label: string }> = [
  { value: 'stovetop', label: 'Stovetop' },
  { value: 'one-pot', label: 'One-Pot / Skillet' },
  { value: 'oven', label: 'Oven' },
  { value: 'air-fryer', label: 'Air Fryer' },
  { value: 'slow-cooker', label: 'Slow Cooker / Instant Pot' },
  { value: 'no-cook', label: 'No-Cook' },
  { value: 'blender', label: 'Blender' },
];

const CUISINE_OPTIONS: CuisineRegion[] = [
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

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  open,
  preferences,
  onClose,
  onChangePreferences,
  onExportBackup,
  onImportBackup,
}) => {
  const [excludeInput, setExcludeInput] = useState('');
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const toggleItem = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((i) => i !== value) : [...arr, value];

  const handleAddExclusion = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = excludeInput.trim().toLowerCase();
    if (!clean) return;
    if (!preferences.excludedIngredients.includes(clean)) {
      onChangePreferences({
        ...preferences,
        excludedIngredients: [...preferences.excludedIngredients, clean],
      });
    }
    setExcludeInput('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onImportBackup(file);
      setBackupMessage('Offline backup restored successfully.');
    } catch {
      setBackupMessage('Invalid backup file.');
    }
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prefs-title"
    >
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] p-6 shadow-2xl space-y-6">
        <div className="w-10 h-1.5 bg-[#D4DDD6] dark:bg-[#2F3B35] rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="prefs-title" className="font-display text-2xl font-semibold text-[#17211C] dark:text-[#ECF1EE]">
              Kitchen &amp; Household Setup
            </h2>
            <p className="text-xs text-[#55655D] dark:text-[#A9B8B0] mt-0.5">
              Tailor meal plans to your lifestyle, budget, equipment, palate, and location.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-[#55655D] hover:bg-[#F2F5F2] dark:hover:bg-[#222D28]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Household Size, Theme & App Install */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#E2E8E2] dark:border-[#242D29] p-4">
            <label className="block text-xs font-semibold text-[#55655D] dark:text-[#A9B8B0]">
              Household Servings
            </label>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onChangePreferences({
                    ...preferences,
                    householdSize: Math.max(1, preferences.householdSize - 1),
                  })
                }
                className="min-h-[44px] min-w-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] font-mono text-base hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]"
              >
                -
              </button>
              <span className="font-mono text-lg font-semibold tabular-nums min-w-[3ch] text-center">
                {preferences.householdSize}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangePreferences({
                    ...preferences,
                    householdSize: Math.min(12, preferences.householdSize + 1),
                  })
                }
                className="min-h-[44px] min-w-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] font-mono text-base hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]"
              >
                +
              </button>
              <span className="text-xs text-[#55655D] dark:text-[#A9B8B0]">people</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8E2] dark:border-[#242D29] p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#55655D] dark:text-[#A9B8B0]">Appearance</p>
              <p className="text-sm font-medium mt-1 capitalize">{preferences.theme} mode</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onChangePreferences({
                  ...preferences,
                  theme: preferences.theme === 'light' ? 'dark' : 'light',
                })
              }
              className="min-h-[44px] px-4 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] inline-flex items-center gap-2 text-sm font-medium hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]"
            >
              {preferences.theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>{preferences.theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>

        {/* Local / Travel Region */}
        <div>
          <label htmlFor="pref-region" className="block text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE]">
            Current Shopping Region (Home or Traveling)
          </label>
          <p className="text-xs text-[#55655D] dark:text-[#A9B8B0] mt-0.5 mb-2">
            Adapts ingredient substitutions and online searches to what is available locally.
          </p>
          <select
            id="pref-region"
            value={preferences.regionId}
            onChange={(e) => onChangePreferences({ ...preferences, regionId: e.target.value })}
            className="w-full min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#111714] px-3 py-2 text-sm"
          >
            {TRAVEL_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.subtitle}
              </option>
            ))}
          </select>
        </div>

        {/* Active Meals Per Day */}
        <div>
          <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-2">
            Meals to Plan Daily
          </p>
          <div className="flex flex-wrap gap-2">
            {(['breakfast', 'lunch', 'dinner'] as MealSlot[]).map((slot) => {
              const active = preferences.activeSlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    const next = toggleItem(preferences.activeSlots, slot);
                    if (next.length > 0) {
                      onChangePreferences({ ...preferences, activeSlots: next });
                    }
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium capitalize border transition-colors ${
                    active
                      ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                      : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget (Purse) & Palate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-2">
              Budget (Purse)
            </p>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#F2F5F2] dark:bg-[#111714]">
              {(['thrifty', 'moderate', 'special'] as BudgetTier[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onChangePreferences({ ...preferences, budgetTier: tier })}
                  className={`min-h-[40px] px-2 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                    preferences.budgetTier === tier
                      ? 'bg-white dark:bg-[#1E2823] text-[#17211C] dark:text-white shadow-sm'
                      : 'text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-2">
              Palate Preference
            </p>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#F2F5F2] dark:bg-[#111714]">
              {(['familiar', 'balanced', 'adventurous'] as PalateStyle[]).map((pal) => (
                <button
                  key={pal}
                  type="button"
                  onClick={() => onChangePreferences({ ...preferences, palate: pal })}
                  className={`min-h-[40px] px-2 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                    preferences.palate === pal
                      ? 'bg-white dark:bg-[#1E2823] text-[#17211C] dark:text-white shadow-sm'
                      : 'text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  {pal}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Kitchen Equipment */}
        <div>
          <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-2">
            Available Kitchen Equipment
          </p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => {
              const active = preferences.equipment.includes(eq.value);
              return (
                <button
                  key={eq.value}
                  type="button"
                  onClick={() =>
                    onChangePreferences({
                      ...preferences,
                      equipment: toggleItem(preferences.equipment, eq.value),
                    })
                  }
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                      : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  {eq.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div>
          <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-2">
            Dietary Needs &amp; Restrictions
          </p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((d) => {
              const active = preferences.dietaryRestrictions.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() =>
                    onChangePreferences({
                      ...preferences,
                      dietaryRestrictions: toggleItem(preferences.dietaryRestrictions, d.value),
                    })
                  }
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                      : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nutritional Goals */}
        <div>
          <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-2">
            Nutritional Goals
          </p>
          <div className="flex flex-wrap gap-2">
            {NUTRITION_OPTIONS.map((n) => {
              const active = preferences.nutritionGoals.includes(n.value);
              return (
                <button
                  key={n.value}
                  type="button"
                  onClick={() =>
                    onChangePreferences({
                      ...preferences,
                      nutritionGoals: toggleItem(preferences.nutritionGoals, n.value),
                    })
                  }
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                      : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Cuisines */}
        <div>
          <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-2">
            Favorite Cuisines &amp; Cultures
          </p>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((cuisine) => {
              const active = preferences.preferredCuisines.includes(cuisine);
              return (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() =>
                    onChangePreferences({
                      ...preferences,
                      preferredCuisines: toggleItem(preferences.preferredCuisines, cuisine),
                    })
                  }
                  className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#1B5E3F] text-white border-[#1B5E3F]'
                      : 'border-[#D4DDD6] dark:border-[#2B3731] text-[#55655D] dark:text-[#A9B8B0]'
                  }`}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>
        </div>

        {/* Excluded Ingredients */}
        <div>
          <p className="text-sm font-semibold text-[#17211C] dark:text-[#ECF1EE] mb-2">
            Disliked or Allergen Ingredients to Exclude
          </p>
          <form onSubmit={handleAddExclusion} className="flex gap-2">
            <input
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              placeholder="e.g. cilantro, mushrooms, shellfish"
              className="flex-1 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#111714] px-3 text-sm"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-lg bg-[#17211C] dark:bg-[#ECF1EE] text-white dark:text-[#17211C] text-sm font-medium whitespace-nowrap shrink-0"
            >
              Exclude
            </button>
          </form>
          {preferences.excludedIngredients.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {preferences.excludedIngredients.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    onChangePreferences({
                      ...preferences,
                      excludedIngredients: preferences.excludedIngredients.filter((x) => x !== item),
                    })
                  }
                  className="min-h-[36px] px-3 py-1 rounded-md border border-[#D4DDD6] dark:border-[#2B3731] text-xs inline-flex items-center gap-1.5 hover:bg-[#FEE2E2]/40"
                >
                  <span>{item}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Install & Offline Backup */}
        <div className="pt-4 border-t border-[#E2E8E2] dark:border-[#242D29] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton />
            <button
              type="button"
              onClick={onExportBackup}
              className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]"
            >
              <Download className="w-4 h-4" />
              <span>Export Backup</span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823]"
            >
              <Upload className="w-4 h-4" />
              <span>Restore Backup</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 rounded-lg bg-[#1B5E3F] text-white text-sm font-medium hover:bg-[#164C33] whitespace-nowrap shrink-0"
          >
            Save &amp; Done
          </button>
        </div>
        {backupMessage && (
          <p className="text-xs text-[#1B5E3F] dark:text-[#6EE7B7]">{backupMessage}</p>
        )}
      </div>
    </div>
  );
};
