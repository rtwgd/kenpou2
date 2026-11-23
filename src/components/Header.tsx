import React from 'react';
import { Moon, Sun } from 'lucide-react';

export type ActiveTab = 'split' | 'keywords' | 'memorize' | 'analytics';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'split', label: '分割練習' },
  { id: 'keywords', label: '重要語句' },
  { id: 'memorize', label: '全暗記挑戦' },
  { id: 'analytics', label: '学習グラフ' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="w-full border-b border-[#E5E2DC] dark:border-neutral-800 bg-[#F9F8F4] dark:bg-[#141413] transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('split')}
          className="font-mincho text-lg font-semibold tracking-wide text-[#1A1917] dark:text-[#EFECE6] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D3557]"
        >
          憲法前文打鍵
        </button>

        <nav
          aria-label="練習モード"
          className="flex items-center gap-4 sm:gap-7 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D3557] ${
                  active
                    ? 'text-[#1D3557] dark:text-[#EFECE6]'
                    : 'text-[#6B6760] hover:text-[#1A1917] dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1D3557] dark:bg-[#EFECE6]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[#DFDCD5] dark:border-neutral-700 text-[#4A4742] dark:text-neutral-300 hover:bg-[#EFECE6] dark:hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D3557]"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">墨色</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">生成</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
