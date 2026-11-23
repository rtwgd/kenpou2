import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import { PREAMBLE_SECTIONS } from '../data/preamble';
import {
  getSkillRank,
  KeyStat,
  PracticeMode,
  TypingSessionRecord,
} from '../utils/storage';

interface AnalyticsViewProps {
  sessions: TypingSessionRecord[];
  keyStats: Record<string, KeyStat>;
  onJumpToSection: (sectionId: string) => void;
  onStartPractice: (mode: PracticeMode) => void;
  onClearProgress: () => void;
}

type ModeFilter = 'all' | PracticeMode;

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  sessions,
  keyStats,
  onJumpToSection,
  onStartPractice,
  onClearProgress,
}) => {
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const filteredSessions = useMemo(() => {
    const list =
      modeFilter === 'all'
        ? sessions
        : sessions.filter((s) => s.mode === modeFilter);
    return list.slice(-40); // Latest 40 sessions for crisp chart legibility
  }, [sessions, modeFilter]);

  const summary = useMemo(() => {
    if (sessions.length === 0) {
      return {
        maxKpm: 0,
        recentAvgKpm: 0,
        avgAccuracy: 0,
        totalCorrect: 0,
        memorizeClearedCount: 0,
      };
    }
    const maxKpm = Math.max(...sessions.map((s) => s.kpm));
    const recent = sessions.slice(-10);
    const recentAvgKpm = Math.round(
      recent.reduce((acc, s) => acc + s.kpm, 0) / recent.length
    );
    const avgAccuracy =
      sessions.reduce((acc, s) => acc + s.accuracy, 0) / sessions.length;
    const totalCorrect = sessions.reduce((acc, s) => acc + s.correctKeys, 0);
    const memorizeClearedCount = new Set(
      sessions
        .filter((s) => s.mode === 'memorize' && s.hintsUsed === 0)
        .map((s) => s.targetId)
    ).size;

    return {
      maxKpm,
      recentAvgKpm,
      avgAccuracy,
      totalCorrect,
      memorizeClearedCount,
    };
  }, [sessions]);

  // Per-section mastery
  const sectionMastery = useMemo(() => {
    const targets = [
      ...PREAMBLE_SECTIONS.map((s) => ({ id: s.id, label: s.title })),
      { id: 'full', label: '全文通し（全8節）' },
    ];
    return targets.map((t) => {
      const matching = sessions.filter((s) => s.targetId === t.id);
      const bestKpm = matching.length > 0 ? Math.max(...matching.map((m) => m.kpm)) : 0;
      const bestAcc =
        matching.length > 0 ? Math.max(...matching.map((m) => m.accuracy)) : 0;
      return {
        ...t,
        attempts: matching.length,
        bestKpm,
        bestAcc,
      };
    });
  }, [sessions]);

  // Weak keys sorted by miss count / error rate
  const weakKeys = useMemo(() => {
    return Object.entries(keyStats)
      .map(([key, stat]) => {
        const total = stat.hits + stat.misses;
        const errorRate = total > 0 ? (stat.misses / total) * 100 : 0;
        return {
          key,
          hits: stat.hits,
          misses: stat.misses,
          total,
          errorRate,
        };
      })
      .filter((item) => item.total >= 3 && item.misses > 0)
      .sort((a, b) => b.errorRate - a.errorRate || b.misses - a.misses)
      .slice(0, 10);
  }, [keyStats]);

  // SVG chart dimensions
  const chartW = 760;
  const chartH = 240;
  const padL = 46;
  const padR = 46;
  const padT = 20;
  const padB = 34;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const maxChartKpm = useMemo(() => {
    if (filteredSessions.length === 0) return 700;
    const peak = Math.max(...filteredSessions.map((s) => s.kpm), 600);
    return Math.ceil(peak / 100) * 100;
  }, [filteredSessions]);

  const points = useMemo(() => {
    const n = filteredSessions.length;
    if (n === 0) return [];
    return filteredSessions.map((s, i) => {
      const x = n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW;
      const yKpm = padT + innerH - (s.kpm / maxChartKpm) * innerH;
      const clampedAcc = Math.max(50, Math.min(100, s.accuracy));
      const yAcc = padT + innerH - ((clampedAcc - 50) / 50) * innerH;
      return { x, yKpm, yAcc, session: s, index: i };
    });
  }, [filteredSessions, innerW, innerH, maxChartKpm]);

  const kpmLinePath = useMemo(() => {
    if (points.length < 2) return '';
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yKpm.toFixed(1)}`)
      .join(' ');
  }, [points]);

  const accLinePath = useMemo(() => {
    if (points.length < 2) return '';
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yAcc.toFixed(1)}`)
      .join(' ');
  }, [points]);

  const kpmAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${kpmLinePath} L ${last.x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${first.x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
  }, [points, kpmLinePath, innerH]);

  const y600 = padT + innerH - (600 / maxChartKpm) * innerH;

  if (sessions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-mincho text-2xl font-semibold text-[#1A1917] dark:text-[#EFECE6]">
          学習グラフと記録
        </h1>
        <p className="text-sm text-[#6B6760] dark:text-neutral-400 mt-3 max-w-md mx-auto leading-relaxed">
          まだ完了した練習記録がありません。分割練習・重要語句・全暗記のいずれかを1回完了すると、打鍵速度（KPM）と正確率の推移、苦手キーの分析がここに表示されます。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => onStartPractice('split')}
            className="px-5 py-2.5 text-sm font-medium rounded bg-[#1D3557] text-white hover:bg-[#162944] dark:bg-[#EFECE6] dark:text-[#141413] transition-colors"
          >
            分割練習をはじめる
          </button>
          <button
            type="button"
            onClick={() => onStartPractice('keywords')}
            className="px-5 py-2.5 text-sm font-medium rounded border border-[#DFDCD5] dark:border-neutral-700 text-[#1A1917] dark:text-neutral-200 hover:bg-[#EFECE6] dark:hover:bg-neutral-800 transition-colors"
          >
            重要語句を練習する
          </button>
        </div>
      </div>
    );
  }

  const maxSectionKpm = Math.max(600, ...sectionMastery.map((s) => s.bestKpm));
  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;
  const maxRank = getSkillRank(summary.maxKpm);

  const modeNames: Record<PracticeMode, string> = {
    split: '分割練習',
    keywords: '重要語句',
    memorize: '全暗記',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-12">
      {/* Summary Strip */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
          <div>
            <h1 className="font-mincho text-2xl font-semibold text-[#1A1917] dark:text-[#EFECE6]">
              学習の進捗と分析
            </h1>
            <p className="text-xs text-[#6B6760] dark:text-neutral-400 mt-1">
              現在の最高到達位: {maxRank.label}
            </p>
          </div>
          <div className="text-xs font-mono-tabular text-[#6B6760] dark:text-neutral-400">
            総練習回数 {sessions.length}回 · 累計正打 {summary.totalCorrect.toLocaleString()}キー
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-5 border-t border-b border-[#E5E2DC] dark:border-neutral-800">
          <div>
            <div className="text-xs text-[#6B6760] dark:text-neutral-400">最高速度</div>
            <div className="font-mono-tabular text-3xl font-semibold text-[#1D3557] dark:text-[#EFECE6] mt-1">
              {summary.maxKpm}
              <span className="text-xs font-normal text-[#6B6760] dark:text-neutral-400 ml-1">
                KPM
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-[#6B6760] dark:text-neutral-400">直近10回平均</div>
            <div className="font-mono-tabular text-3xl font-semibold text-[#1A1917] dark:text-[#EFECE6] mt-1">
              {summary.recentAvgKpm}
              <span className="text-xs font-normal text-[#6B6760] dark:text-neutral-400 ml-1">
                KPM
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-[#6B6760] dark:text-neutral-400">平均正確率</div>
            <div className="font-mono-tabular text-3xl font-semibold text-[#1A1917] dark:text-[#EFECE6] mt-1">
              {summary.avgAccuracy.toFixed(1)}
              <span className="text-xs font-normal text-[#6B6760] dark:text-neutral-400 ml-0.5">
                %
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-[#6B6760] dark:text-neutral-400">ノーヒント暗記</div>
            <div className="font-mono-tabular text-3xl font-semibold text-[#1A1917] dark:text-[#EFECE6] mt-1">
              {summary.memorizeClearedCount}
              <span className="text-xs font-normal text-[#6B6760] dark:text-neutral-400 ml-1">
                / 5枠
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Chart 1: KPM & Accuracy Progression */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#1A1917] dark:text-[#EFECE6]">
              打鍵速度（KPM）と正確率の推移
            </h2>
            <p className="text-xs text-[#6B6760] dark:text-neutral-400 mt-0.5">
              実線: 打鍵速度（左軸 KPM） · 破線: 正確率（右軸 50–100%） · 横点線: 600 KPM 達人基準
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#EFECE6] dark:bg-neutral-900 rounded">
            {(
              [
                { id: 'all', label: 'すべて' },
                { id: 'split', label: '分割練習' },
                { id: 'keywords', label: '重要語句' },
                { id: 'memorize', label: '全暗記' },
              ] as { id: ModeFilter; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setModeFilter(item.id);
                  setHoveredIdx(null);
                }}
                className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                  modeFilter === item.id
                    ? 'bg-white dark:bg-neutral-800 text-[#1A1917] dark:text-[#EFECE6] font-medium shadow-xs'
                    : 'text-[#6B6760] dark:text-neutral-400 hover:text-[#1A1917] dark:hover:text-neutral-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6760] dark:text-neutral-400 border border-[#E5E2DC] dark:border-neutral-800 rounded">
            このモードの記録はまだありません。
          </div>
        ) : (
          <div className="relative border border-[#E5E2DC] dark:border-neutral-800 rounded p-4 bg-white dark:bg-[#191918]">
            {/* Hover Readout Bar */}
            <div className="h-5 mb-2 flex items-center justify-between text-xs font-mono-tabular text-[#6B6760] dark:text-neutral-400">
              {hoveredPoint ? (
                <div className="flex flex-wrap items-center gap-3 text-[#1A1917] dark:text-neutral-200">
                  <span>
                    {new Date(hoveredPoint.session.timestamp).toLocaleString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>·</span>
                  <span>{hoveredPoint.session.targetTitle}</span>
                  <span>·</span>
                  <span className="font-semibold text-[#1D3557] dark:text-[#EFECE6]">
                    {hoveredPoint.session.kpm} KPM
                  </span>
                  <span>·</span>
                  <span>正確率 {hoveredPoint.session.accuracy.toFixed(1)}%</span>
                </div>
              ) : (
                <span>グラフ上の点にカーソルを合わせると詳細を表示します（直近{filteredSessions.length}件）</span>
              )}
            </div>

            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label="打鍵速度と正確率の推移グラフ"
            >
              {/* Horizontal Y Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = padT + innerH * (1 - t);
                const kpmVal = Math.round(maxChartKpm * t);
                const accVal = Math.round(50 + 50 * t);
                return (
                  <g key={t}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke="currentColor"
                      className="text-[#E5E2DC] dark:text-neutral-800"
                      strokeWidth="1"
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-[#8C877E] dark:fill-neutral-500 text-[10px] font-mono-tabular"
                    >
                      {kpmVal}
                    </text>
                    <text
                      x={chartW - padR + 8}
                      y={y + 4}
                      textAnchor="start"
                      className="fill-[#8C877E] dark:fill-neutral-500 text-[10px] font-mono-tabular"
                    >
                      {accVal}%
                    </text>
                  </g>
                );
              })}

              {/* 600 KPM Expert Benchmark */}
              {600 <= maxChartKpm && (
                <g>
                  <line
                    x1={padL}
                    y1={y600}
                    x2={chartW - padR}
                    y2={y600}
                    stroke="#B93829"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padL + 6}
                    y={y600 - 5}
                    className="fill-[#B93829] text-[10px] font-mono-tabular"
                  >
                    600 KPM
                  </text>
                </g>
              )}

              {/* Area under KPM curve */}
              {kpmAreaPath && (
                <path
                  d={kpmAreaPath}
                  className="fill-[#1D3557]/8 dark:fill-[#EFECE6]/8"
                />
              )}

              {/* Accuracy dashed curve */}
              {accLinePath && (
                <path
                  d={accLinePath}
                  fill="none"
                  className="stroke-[#8C877E] dark:stroke-neutral-500"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* KPM solid curve */}
              {kpmLinePath && (
                <path
                  d={kpmLinePath}
                  fill="none"
                  className="stroke-[#1D3557] dark:stroke-[#EFECE6]"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* Hover Vertical Guide */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={padT}
                  x2={hoveredPoint.x}
                  y2={padT + innerH}
                  stroke="currentColor"
                  className="text-[#1D3557]/30 dark:text-neutral-600"
                  strokeWidth="1"
                />
              )}

              {/* Interactive Data Points */}
              {points.map((p) => {
                const isHovered = hoveredIdx === p.index;
                return (
                  <g key={p.session.id}>
                    <circle
                      cx={p.x}
                      cy={p.yAcc}
                      r={isHovered ? 3.5 : 2}
                      className="fill-[#8C877E] dark:fill-neutral-400"
                    />
                    <circle
                      cx={p.x}
                      cy={p.yKpm}
                      r={isHovered ? 5 : 3.2}
                      className="fill-[#1D3557] dark:fill-[#EFECE6] stroke-white dark:stroke-[#191918]"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={p.x - Math.max(8, innerW / Math.max(2, points.length) / 2)}
                      y={padT}
                      width={Math.max(16, innerW / Math.max(2, points.length))}
                      height={innerH}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(p.index)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  </g>
                );
              })}

              {/* X-axis endpoints */}
              {points.length > 0 && (
                <>
                  <text
                    x={padL}
                    y={chartH - 8}
                    textAnchor="start"
                    className="fill-[#8C877E] dark:fill-neutral-500 text-[10px] font-mono-tabular"
                  >
                    #{Math.max(1, sessions.length - filteredSessions.length + 1)}回目
                  </text>
                  <text
                    x={chartW - padR}
                    y={chartH - 8}
                    textAnchor="end"
                    className="fill-[#8C877E] dark:fill-neutral-500 text-[10px] font-mono-tabular"
                  >
                    最新
                  </text>
                </>
              )}
            </svg>
          </div>
        )}
      </section>

      {/* Chart 2 & 3 Two-Column Editorial Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Section Mastery Bar Chart */}
        <section className="lg:col-span-7">
          <h2 className="text-base font-semibold text-[#1A1917] dark:text-[#EFECE6]">
            前文セクション別・最高速度
          </h2>
          <p className="text-xs text-[#6B6760] dark:text-neutral-400 mt-0.5 mb-4">
            各節の達成速度を比較できます。クリックするとその節の練習へ移動します。
          </p>

          <div className="divide-y divide-[#E5E2DC] dark:divide-neutral-800 border-t border-b border-[#E5E2DC] dark:border-neutral-800">
            {sectionMastery.map((sec) => {
              const barPct =
                sec.bestKpm > 0 ? Math.min(100, (sec.bestKpm / maxSectionKpm) * 100) : 0;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => onJumpToSection(sec.id)}
                  className="w-full py-3 text-left group hover:bg-[#EFECE6]/60 dark:hover:bg-neutral-900/60 px-2 -mx-2 rounded transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-[#1A1917] dark:text-neutral-200 inline-flex items-center gap-1">
                      <span>{sec.label}</span>
                      <ArrowUpRight
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="font-mono-tabular text-[#6B6760] dark:text-neutral-400">
                      {sec.attempts > 0
                        ? `${sec.bestKpm} KPM · ${sec.bestAcc.toFixed(0)}% · ${sec.attempts}回`
                        : '未練習'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#EFECE6] dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1D3557] dark:bg-[#EFECE6] transition-all duration-300"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Weak Keys Analysis */}
        <section className="lg:col-span-5">
          <h2 className="text-base font-semibold text-[#1A1917] dark:text-[#EFECE6]">
            苦手キー分析（誤打率）
          </h2>
          <p className="text-xs text-[#6B6760] dark:text-neutral-400 mt-0.5 mb-4">
            誤打率が高いキーから順に表示しています。
          </p>

          {weakKeys.length === 0 ? (
            <div className="py-8 px-4 text-xs text-[#6B6760] dark:text-neutral-400 border border-[#E5E2DC] dark:border-neutral-800 rounded">
              まだ十分な誤打データがありません。正確率の高い打鍵を維持できています。
            </div>
          ) : (
            <div className="space-y-3 border-t border-b border-[#E5E2DC] dark:border-neutral-800 py-3">
              {weakKeys.map((wk) => (
                <div key={wk.key} className="flex items-center gap-3 text-xs">
                  <span className="w-7 h-7 rounded border border-[#DFDCD5] dark:border-neutral-700 flex items-center justify-center font-mono-tabular font-semibold uppercase text-[#1A1917] dark:text-[#EFECE6] shrink-0">
                    {wk.key}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between font-mono-tabular mb-1">
                      <span className="text-[#B93829] font-medium">
                        誤打率 {wk.errorRate.toFixed(1)}%
                      </span>
                      <span className="text-[#6B6760] dark:text-neutral-400">
                        誤 {wk.misses} / 全 {wk.total}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#EFECE6] dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#B93829]"
                        style={{ width: `${Math.min(100, wk.errorRate * 2.5)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Log Table + Clear Action */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#1A1917] dark:text-[#EFECE6]">
            最近の練習履歴
          </h2>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#6B6760] hover:text-[#B93829] dark:text-neutral-400 dark:hover:text-[#B93829] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>記録を消去</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#B93829]">全記録を削除しますか？</span>
              <button
                type="button"
                onClick={() => {
                  onClearProgress();
                  setConfirmClear(false);
                }}
                className="px-2.5 py-1 rounded bg-[#B93829] text-white font-medium"
              >
                削除する
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-2.5 py-1 rounded border border-[#DFDCD5] dark:border-neutral-700"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border-t border-b border-[#E5E2DC] dark:border-neutral-800">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E5E2DC] dark:border-neutral-800 text-xs text-[#6B6760] dark:text-neutral-400">
                <th className="py-2.5 pr-4 font-medium">日時</th>
                <th className="py-2.5 pr-4 font-medium">種別</th>
                <th className="py-2.5 pr-4 font-medium">項目</th>
                <th className="py-2.5 pr-4 font-medium text-right">KPM</th>
                <th className="py-2.5 pr-4 font-medium text-right">正確率</th>
                <th className="py-2.5 font-medium text-right">時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC]/60 dark:divide-neutral-800/60">
              {sessions
                .slice(-10)
                .reverse()
                .map((s) => (
                  <tr key={s.id} className="text-[#1A1917] dark:text-neutral-200">
                    <td className="py-2.5 pr-4 font-mono-tabular text-xs text-[#6B6760] dark:text-neutral-400 whitespace-nowrap">
                      {new Date(s.timestamp).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-xs text-[#6B6760] dark:text-neutral-400">
                      {modeNames[s.mode]}
                    </td>
                    <td className="py-2.5 pr-4 truncate max-w-[220px]">{s.targetTitle}</td>
                    <td className="py-2.5 pr-4 font-mono-tabular font-semibold text-right text-[#1D3557] dark:text-[#EFECE6]">
                      {s.kpm}
                    </td>
                    <td className="py-2.5 pr-4 font-mono-tabular text-right">
                      {s.accuracy.toFixed(1)}%
                    </td>
                    <td className="py-2.5 font-mono-tabular text-right text-[#6B6760] dark:text-neutral-400">
                      {(s.durationMs / 1000).toFixed(1)}s
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
