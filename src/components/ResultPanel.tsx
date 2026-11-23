import React from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { getSkillRank, PracticeMode, TypingSessionRecord } from '../utils/storage';

interface ResultPanelProps {
  record: TypingSessionRecord;
  sessionMissedKeys: Record<string, number>;
  hasNext: boolean;
  nextLabel?: string;
  onRetry: () => void;
  onNext: () => void;
  onViewAnalytics: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  record,
  sessionMissedKeys,
  hasNext,
  nextLabel = '次のセクションへ',
  onRetry,
  onNext,
  onViewAnalytics,
}) => {
  const rank = getSkillRank(record.kpm);
  const seconds = (record.durationMs / 1000).toFixed(1);
  const missedEntries = Object.entries(sessionMissedKeys)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const modeLabel: Record<PracticeMode, string> = {
    split: '分割練習',
    keywords: '重要語句',
    memorize: '全暗記挑戦',
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8 border-t border-b border-[#E5E2DC] dark:border-neutral-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
        <div>
          <p className="text-xs text-[#6B6760] dark:text-neutral-400">
            {modeLabel[record.mode]} · {record.targetTitle}
          </p>
          <h2 className="font-mincho text-2xl font-semibold text-[#1A1917] dark:text-[#EFECE6] mt-1">
            打鍵完了 — {rank.label}
          </h2>
          <p className="text-sm text-[#6B6760] dark:text-neutral-400 mt-0.5">{rank.description}</p>
        </div>

        {record.mode === 'memorize' && (
          <div className="text-sm font-medium text-[#1D3557] dark:text-[#EFECE6]">
            {record.hintsUsed === 0
              ? 'ノーヒント暗記達成'
              : `ヒント使用 ${record.hintsUsed}回`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6 border-t border-b border-[#E5E2DC] dark:border-neutral-800">
        <div>
          <div className="text-xs text-[#6B6760] dark:text-neutral-400">打鍵速度</div>
          <div className="font-mono-tabular text-3xl sm:text-4xl font-semibold text-[#1D3557] dark:text-[#EFECE6] mt-1">
            {record.kpm}
            <span className="text-sm font-normal text-[#6B6760] dark:text-neutral-400 ml-1">KPM</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-[#6B6760] dark:text-neutral-400">正確率</div>
          <div className="font-mono-tabular text-3xl sm:text-4xl font-semibold text-[#1A1917] dark:text-[#EFECE6] mt-1">
            {record.accuracy.toFixed(1)}
            <span className="text-sm font-normal text-[#6B6760] dark:text-neutral-400 ml-0.5">%</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-[#6B6760] dark:text-neutral-400">所要時間</div>
          <div className="font-mono-tabular text-3xl sm:text-4xl font-semibold text-[#1A1917] dark:text-[#EFECE6] mt-1">
            {seconds}
            <span className="text-sm font-normal text-[#6B6760] dark:text-neutral-400 ml-1">秒</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-[#6B6760] dark:text-neutral-400">正打 / 誤打</div>
          <div className="font-mono-tabular text-2xl sm:text-3xl font-semibold text-[#1A1917] dark:text-[#EFECE6] mt-1.5">
            {record.correctKeys}
            <span className="text-base font-normal text-[#6B6760] dark:text-neutral-400 mx-1">/</span>
            <span className={record.errorKeys > 0 ? 'text-[#B93829]' : ''}>{record.errorKeys}</span>
          </div>
        </div>
      </div>

      {missedEntries.length > 0 && (
        <div className="mt-4 text-xs text-[#6B6760] dark:text-neutral-400 flex flex-wrap items-center gap-2">
          <span>今回の誤打キー:</span>
          <span className="font-mono-tabular text-[#1A1917] dark:text-neutral-200">
            {missedEntries.map(([k, count], idx) => (
              <React.Fragment key={k}>
                {idx > 0 && <span className="mx-1.5 text-[#A6A198]">·</span>}
                <span>
                  {k.toUpperCase()} ({count}回)
                </span>
              </React.Fragment>
            ))}
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded border border-[#DFDCD5] dark:border-neutral-700 text-[#1A1917] dark:text-neutral-200 hover:bg-[#EFECE6] dark:hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>もう一度（Esc）</span>
          </button>

          {hasNext && (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded bg-[#1D3557] text-white hover:bg-[#162944] dark:bg-[#EFECE6] dark:text-[#141413] dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
            >
              <span>{nextLabel}（Enter）</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onViewAnalytics}
          className="text-xs font-medium text-[#6B6760] hover:text-[#1D3557] dark:text-neutral-400 dark:hover:text-neutral-200 underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
        >
          学習グラフで推移を見る
        </button>
      </div>
    </div>
  );
};
