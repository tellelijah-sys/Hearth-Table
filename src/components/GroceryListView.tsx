import React, { useState } from 'react';
import { Check, Copy, PackagePlus, Plus, Trash2 } from 'lucide-react';
import type {
  AggregatedGroceryItem,
  CustomGroceryItem,
  GroceryAisle,
  TravelRegion,
} from '../types/meal';
import { formatGroceryListPlainText, formatQuantity } from '../utils/mealEngine';

interface GroceryListViewProps {
  items: AggregatedGroceryItem[];
  customItems: CustomGroceryItem[];
  householdSize: number;
  region: TravelRegion;
  onToggleChecked: (key: string) => void;
  onToggleCustomChecked: (id: string) => void;
  onAddCustomItem: (name: string, quantityText: string, aisle: GroceryAisle) => void;
  onRemoveCustomItem: (id: string) => void;
  onMoveCheckedToPantry: () => void;
  onClearChecked: () => void;
}

const AISLE_ORDER: GroceryAisle[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Grains & Bakery',
  'Canned & Dry Goods',
  'Spices & Oils',
  'Frozen & Other',
];

export const GroceryListView: React.FC<GroceryListViewProps> = ({
  items,
  customItems,
  householdSize,
  region,
  onToggleChecked,
  onToggleCustomChecked,
  onAddCustomItem,
  onRemoveCustomItem,
  onMoveCheckedToPantry,
  onClearChecked,
}) => {
  const [filterMode, setFilterMode] = useState<'needed' | 'pantry' | 'all'>('needed');
  const [extraName, setExtraName] = useState('');
  const [extraQty, setExtraQty] = useState('');
  const [extraAisle, setExtraAisle] = useState<GroceryAisle>('Produce');
  const [copied, setCopied] = useState(false);

  const neededItems = items.filter((i) => !i.inPantry);
  const pantryCoveredItems = items.filter((i) => i.inPantry);

  const visibleRecipeItems =
    filterMode === 'needed'
      ? neededItems
      : filterMode === 'pantry'
        ? pantryCoveredItems
        : items;

  const checkedCount =
    neededItems.filter((i) => i.checked).length + customItems.filter((c) => c.checked).length;

  const handleAddExtra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim()) return;
    onAddCustomItem(extraName.trim(), extraQty.trim(), extraAisle);
    setExtraName('');
    setExtraQty('');
  };

  const handleCopyList = async () => {
    const text = formatGroceryListPlainText(neededItems, customItems);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore if clipboard blocked
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#17211C] dark:text-[#ECF1EE]">
            Automated Grocery List
          </h1>
          <p className="mt-1 text-sm text-[#55655D] dark:text-[#A9B8B0] tabular-nums">
            Synced to your weekly plan for {householdSize} servings · {pantryCoveredItems.length} ingredients already covered by your pantry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyList}
            className="min-h-[44px] px-4 py-2 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#171F1B] text-xs font-medium inline-flex items-center gap-2 hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-[#1B5E3F]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied List' : 'Share / Copy'}</span>
          </button>

          {checkedCount > 0 && (
            <button
              type="button"
              onClick={onMoveCheckedToPantry}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-[#1B5E3F] text-white text-xs font-medium inline-flex items-center gap-2 hover:bg-[#164C33] whitespace-nowrap shrink-0"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Move {checkedCount} Bought to Pantry</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs + Add Extra Household Item */}
      <div className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EEF2EE] dark:bg-[#111714]">
            <button
              type="button"
              onClick={() => setFilterMode('needed')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                filterMode === 'needed'
                  ? 'bg-white dark:bg-[#1E2823] text-[#17211C] dark:text-white shadow-sm'
                  : 'text-[#55655D] dark:text-[#A9B8B0]'
              }`}
            >
              To Buy ({neededItems.length + customItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pantry')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                filterMode === 'pantry'
                  ? 'bg-white dark:bg-[#1E2823] text-[#17211C] dark:text-white shadow-sm'
                  : 'text-[#55655D] dark:text-[#A9B8B0]'
              }`}
            >
              In Pantry ({pantryCoveredItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-[#1E2823] text-[#17211C] dark:text-white shadow-sm'
                  : 'text-[#55655D] dark:text-[#A9B8B0]'
              }`}
            >
              All ({items.length + customItems.length})
            </button>
          </div>

          {checkedCount > 0 && (
            <button
              type="button"
              onClick={onClearChecked}
              className="min-h-[40px] px-3 text-xs font-medium text-[#55655D] hover:text-[#17211C] dark:hover:text-[#ECF1EE]"
            >
              Uncheck All
            </button>
          )}
        </div>

        <form onSubmit={handleAddExtra} className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-[#E2E8E2] dark:border-[#242D29]">
          <input
            type="text"
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            placeholder="Add extra item (e.g. fruit snacks, coffee, dish soap)..."
            className="flex-1 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3.5 text-sm"
          />
          <input
            type="text"
            value={extraQty}
            onChange={(e) => setExtraQty(e.target.value)}
            placeholder="Qty (e.g. 2 packs)"
            className="sm:w-36 min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3.5 text-sm"
          />
          <select
            value={extraAisle}
            onChange={(e) => setExtraAisle(e.target.value as GroceryAisle)}
            className="min-h-[44px] rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-[#FAFBF9] dark:bg-[#111714] px-3 text-sm"
          >
            {AISLE_ORDER.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-[44px] px-4 rounded-lg bg-[#17211C] dark:bg-[#ECF1EE] text-white dark:text-[#17211C] text-sm font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Extra</span>
          </button>
        </form>
      </div>

      {/* Empty State */}
      {visibleRecipeItems.length === 0 && (filterMode === 'pantry' || customItems.length === 0) ? (
        <div className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] p-10 text-center">
          <p className="font-display text-lg font-semibold">
            {filterMode === 'pantry'
              ? 'No planned ingredients matched your pantry yet'
              : 'Your grocery list is empty'}
          </p>
          <p className="mt-1 text-sm text-[#55655D] dark:text-[#A9B8B0]">
            Add meals to your Weekly Plan and your aisle-sorted shopping list will sync automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {AISLE_ORDER.map((aisle) => {
            const aisleRecipeItems = visibleRecipeItems.filter((i) => i.aisle === aisle);
            const aisleCustomItems =
              filterMode === 'pantry' ? [] : customItems.filter((c) => c.aisle === aisle);

            if (aisleRecipeItems.length === 0 && aisleCustomItems.length === 0) return null;

            return (
              <section
                key={aisle}
                className="rounded-2xl border border-[#E2E8E2] dark:border-[#242D29] bg-white dark:bg-[#171F1B] overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-[#E2E8E2] dark:border-[#242D29] bg-[#FAFBF9] dark:bg-[#121815] flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-[#17211C] dark:text-[#ECF1EE]">
                    {aisle}
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-[#55655D] dark:text-[#A9B8B0]">
                    {aisleRecipeItems.length + aisleCustomItems.length}
                  </span>
                </div>

                <ul className="divide-y divide-[#E2E8E2] dark:divide-[#242D29]">
                  {aisleRecipeItems.map((item) => {
                    const regionSub = Object.entries(region.substitutionTips).find(([k]) =>
                      item.name.toLowerCase().includes(k.toLowerCase())
                    )?.[1];

                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => onToggleChecked(item.key)}
                          className="w-full px-5 py-3.5 min-h-[56px] flex items-start justify-between gap-4 text-left hover:bg-[#FAFBF9] dark:hover:bg-[#1C2621] transition-colors"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <span
                              className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                item.checked
                                  ? 'bg-[#1B5E3F] border-[#1B5E3F] text-white'
                                  : 'border-[#B8C4BC] dark:border-[#3A4A42]'
                              }`}
                            >
                              {item.checked && <Check className="w-3.5 h-3.5" />}
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  item.checked
                                    ? 'line-through text-[#8A9A91]'
                                    : 'text-[#17211C] dark:text-[#ECF1EE]'
                                }`}
                              >
                                <span className="font-mono tabular-nums">
                                  {formatQuantity(item.totalQuantity)} {item.unit}
                                </span>{' '}
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-xs text-[#55655D] dark:text-[#A9B8B0] truncate">
                                For: {item.fromRecipes.join(', ')}
                                {(regionSub || item.substitutes.length > 0) &&
                                  ` · Alt: ${regionSub || item.substitutes.join(', ')}`}
                              </p>
                            </div>
                          </div>

                          {item.inPantry && (
                            <span className="text-xs font-medium text-[#1B5E3F] dark:text-[#6EE7B7] whitespace-nowrap shrink-0">
                              In Pantry
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}

                  {aisleCustomItems.map((c) => (
                    <li
                      key={c.id}
                      className="px-5 py-3 min-h-[56px] flex items-center justify-between gap-3 hover:bg-[#FAFBF9] dark:hover:bg-[#1C2621]"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleCustomChecked(c.id)}
                        className="flex-1 flex items-center gap-3.5 text-left min-h-[44px]"
                      >
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            c.checked
                              ? 'bg-[#1B5E3F] border-[#1B5E3F] text-white'
                              : 'border-[#B8C4BC] dark:border-[#3A4A42]'
                          }`}
                        >
                          {c.checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            c.checked
                              ? 'line-through text-[#8A9A91]'
                              : 'text-[#17211C] dark:text-[#ECF1EE]'
                          }`}
                        >
                          {c.quantityText ? `${c.quantityText} ` : ''}
                          {c.name}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveCustomItem(c.id)}
                        aria-label={`Delete ${c.name}`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#55655D] hover:text-[#B91C1C]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
