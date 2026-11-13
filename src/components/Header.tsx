import React from 'react';
import { CalendarDays, Compass, Package, ShoppingCart, SlidersHorizontal } from 'lucide-react';

export type AppTab = 'plan' | 'discover' | 'pantry' | 'groceries';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenPreferences: () => void;
  groceryNeedCount: number;
}

const NAV_ITEMS: Array<{ id: AppTab; label: string; mobileLabel: string }> = [
  { id: 'plan', label: 'Meal Plan', mobileLabel: 'Plan' },
  { id: 'discover', label: 'Discover', mobileLabel: 'Discover' },
  { id: 'pantry', label: 'Pantry', mobileLabel: 'Pantry' },
  { id: 'groceries', label: 'Groceries', mobileLabel: 'Groceries' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenPreferences,
  groceryNeedCount,
}) => {
  return (
    <>
      {/* Desktop & Mobile Top Bar (strict 3-zone contract on desktop, compact 50px on mobile) */}
      <header className="sticky top-0 z-30 border-b border-[#E2E8E2] dark:border-[#242D29] bg-[#FAFBF9]/95 dark:bg-[#0F1412]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[52px] md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title (single text element) */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('plan');
            }}
            className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#17211C] dark:text-[#ECF1EE] whitespace-nowrap shrink-0"
          >
            Hearth &amp; Table
          </a>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#1B5E3F] dark:text-[#6EE7B7]'
                      : 'text-[#55655D] dark:text-[#A9B8B0] hover:text-[#17211C] dark:hover:text-[#ECF1EE]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.id === 'groceries' && groceryNeedCount > 0 && (
                    <span className="ml-1.5 font-mono text-xs tabular-nums text-[#55655D] dark:text-[#A9B8B0]">
                      ({groceryNeedCount})
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[#1B5E3F] dark:bg-[#6EE7B7]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenPreferences}
              className="px-4 py-2 min-h-[40px] md:min-h-[44px] rounded-lg bg-[#1B5E3F] text-white text-xs sm:text-sm font-medium hover:bg-[#164C33] transition-colors whitespace-nowrap shrink-0"
            >
              Preferences
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Thumb-Zone Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#141B17]/95 backdrop-blur-md border-t border-[#E2E8E2] dark:border-[#242D29] pb-safe"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 h-[58px] items-center">
          <button
            type="button"
            onClick={() => onSelectTab('plan')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'plan'
                ? 'text-[#1B5E3F] dark:text-[#6EE7B7]'
                : 'text-[#55655D] dark:text-[#A9B8B0]'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[11px] font-medium">Plan</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('discover')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'discover'
                ? 'text-[#1B5E3F] dark:text-[#6EE7B7]'
                : 'text-[#55655D] dark:text-[#A9B8B0]'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[11px] font-medium">Discover</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('pantry')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'pantry'
                ? 'text-[#1B5E3F] dark:text-[#6EE7B7]'
                : 'text-[#55655D] dark:text-[#A9B8B0]'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[11px] font-medium">Pantry</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('groceries')}
            className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'groceries'
                ? 'text-[#1B5E3F] dark:text-[#6EE7B7]'
                : 'text-[#55655D] dark:text-[#A9B8B0]'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {groceryNeedCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 rounded-full bg-[#1B5E3F] text-white text-[10px] font-mono tabular-nums flex items-center justify-center">
                  {groceryNeedCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium">Groceries</span>
          </button>

          <button
            type="button"
            onClick={onOpenPreferences}
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#55655D] dark:text-[#A9B8B0]"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[11px] font-medium">Setup</span>
          </button>
        </div>
      </nav>
    </>
  );
};
