import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, HelpCircle, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  KEY_WORDS,
  PREAMBLE_SECTIONS,
  PreambleToken,
  resolveToken,
} from '../data/preamble';
import {
  createTypingState,
  getExpectedNextKey,
  getRemainingRomajiForRange,
  processTypingKey,
  TypingState,
} from '../utils/romaji';
import { playCompleteChime, playKeyClick, playTypoSound } from '../utils/sound';
import {
  KeyStat,
  PracticeMode,
  TypingSessionRecord,
  UserPreferences,
} from '../utils/storage';
import { KeyboardGuide } from './KeyboardGuide';
import { ResultPanel } from './ResultPanel';

interface PracticeViewProps {
  mode: PracticeMode;
  prefs: UserPreferences;
  onUpdatePrefs: (patch: Partial<UserPreferences>) => void;
  sessions: TypingSessionRecord[];
  onRecordSession: (
    record: TypingSessionRecord,
    keyDelta: Record<string, KeyStat>
  ) => void;
  onGoAnalytics: () => void;
  initialSectionId?: string;
}

type KeywordPoolId = 'all' | 'random10' | 'p1' | 'p2' | 'p34';
type MemorizeScopeId = 'all' | 'p1' | 'p2' | 'p3' | 'p4';

export const PracticeView: React.FC<PracticeViewProps> = ({
  mode,
  prefs,
  onUpdatePrefs,
  sessions,
  onRecordSession,
  onGoAnalytics,
  initialSectionId,
}) => {
  // Split mode selection
  const [selectedSplitId, setSelectedSplitId] = useState<string>(
    initialSectionId || 'sec-1'
  );

  // Sync external section jump (from Analytics view)
  useEffect(() => {
    if (initialSectionId) {
      setSelectedSplitId(initialSectionId);
    }
  }, [initialSectionId]);

  // Keyword mode selection
  const [keywordPool, setKeywordPool] = useState<KeywordPoolId>('random10');
  const [keywordSeed, setKeywordSeed] = useState<number>(1);
  const [keywordIndex, setKeywordIndex] = useState<number>(0);

  // Memorize mode selection
  const [memorizeScope, setMemorizeScope] = useState<MemorizeScopeId>('p1');
  const [memorizeHintMode, setMemorizeHintMode] = useState<'blank' | 'initial'>('blank');
  const [revealedTokenIndices, setRevealedTokenIndices] = useState<Set<number>>(new Set());
  const [gaveUp, setGaveUp] = useState<boolean>(false);
  const [hintsUsed, setHintsUsed] = useState<number>(0);

  // Typing runtime state
  const [typingState, setTypingState] = useState<TypingState>(() =>
    createTypingState(PREAMBLE_SECTIONS[0].tokens, prefs.textStyle)
  );
  const [started, setStarted] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [correctKeys, setCorrectKeys] = useState<number>(0);
  const [errorKeys, setErrorKeys] = useState<number>(0);
  const [hasRecentMistake, setHasRecentMistake] = useState<boolean>(false);
  const [shakeSeq, setShakeSeq] = useState<number>(0);
  const [imeWarning, setImeWarning] = useState<boolean>(false);
  const [lastKeyPress, setLastKeyPress] = useState<{
    key: string;
    outcome: 'hit' | 'typo';
    seq: number;
  } | null>(null);
  const [completedRecord, setCompletedRecord] = useState<TypingSessionRecord | null>(null);
  const [sessionMissedKeys, setSessionMissedKeys] = useState<Record<string, number>>({});

  // Refs for low-latency timing and key delta accumulation
  const startTimeRef = useRef<number | null>(null);
  const keyDeltaRef = useRef<Record<string, KeyStat>>({});
  const missedKeysRef = useRef<Record<string, number>>({});
  const correctKeysRef = useRef<number>(0);
  const errorKeysRef = useRef<number>(0);
  const hintsUsedRef = useRef<number>(0);
  const activeTokenElRef = useRef<HTMLSpanElement | null>(null);

  // Build keyword list for current pool
  const activeKeywordList = useMemo(() => {
    if (keywordPool === 'p1') {
      return KEY_WORDS.filter((w) => ['sec-1', 'sec-2', 'sec-3'].includes(w.sectionId));
    }
    if (keywordPool === 'p2') {
      return KEY_WORDS.filter((w) => ['sec-4', 'sec-5', 'sec-6'].includes(w.sectionId));
    }
    if (keywordPool === 'p34') {
      return KEY_WORDS.filter((w) => ['sec-7', 'sec-8'].includes(w.sectionId));
    }
    if (keywordPool === 'random10') {
      // Deterministic shuffle per seed
      const copy = [...KEY_WORDS];
      let s = keywordSeed * 9301 + 49297;
      for (let i = copy.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, 10);
    }
    return KEY_WORDS;
  }, [keywordPool, keywordSeed]);

  // Build active tokens & target metadata
  const currentTarget = useMemo((): {
    id: string;
    title: string;
    subtitle: string;
    tokens: PreambleToken[];
  } => {
    if (mode === 'split') {
      if (selectedSplitId === 'full') {
        return {
          id: 'full',
          title: '日本国憲法前文（全文通し）',
          subtitle: '第一段落〜第四段落・全8節',
          tokens: PREAMBLE_SECTIONS.flatMap((s) => s.tokens),
        };
      }
      const sec = PREAMBLE_SECTIONS.find((s) => s.id === selectedSplitId) ?? PREAMBLE_SECTIONS[0];
      return {
        id: sec.id,
        title: sec.title,
        subtitle: sec.summary,
        tokens: sec.tokens,
      };
    }

    if (mode === 'keywords') {
      const word = activeKeywordList[keywordIndex] ?? activeKeywordList[0];
      const poolTitles: Record<KeywordPoolId, string> = {
        all: '重要語句（全28語）',
        random10: '重要語句（ランダム10問）',
        p1: '重要語句（第一段落）',
        p2: '重要語句（第二段落）',
        p34: '重要語句（第三・四段落）',
      };
      return {
        id: `kw-${keywordPool}`,
        title: poolTitles[keywordPool],
        subtitle: word.meaning,
        tokens: [{ display: word.display, reading: word.reading }],
      };
    }

    // Memorize mode
    if (memorizeScope === 'all') {
      return {
        id: 'mem-all',
        title: '全暗記挑戦（前文すべて）',
        subtitle: '第一段落〜第四段落',
        tokens: PREAMBLE_SECTIONS.flatMap((s) => s.tokens),
      };
    }
    const paraNum = Number(memorizeScope.slice(1));
    const secs = PREAMBLE_SECTIONS.filter((s) => s.paragraph === paraNum);
    const paraTitles: Record<number, string> = {
      1: '全暗記挑戦（第一段落）',
      2: '全暗記挑戦（第二段落）',
      3: '全暗記挑戦（第三段落）',
      4: '全暗記挑戦（第四段落）',
    };
    return {
      id: `mem-p${paraNum}`,
      title: paraTitles[paraNum] ?? '全暗記挑戦',
      subtitle: `${secs.map((s) => s.title).join(' / ')}`,
      tokens: secs.flatMap((s) => s.tokens),
    };
  }, [mode, selectedSplitId, activeKeywordList, keywordIndex, keywordPool, memorizeScope]);

  // Reset typing state cleanly
  const resetSession = useCallback(
    (resetKeywordSequence = true) => {
      if (mode === 'keywords' && resetKeywordSequence) {
        setKeywordIndex(0);
      }
      const nextTokens =
        mode === 'keywords' && resetKeywordSequence
          ? [{ display: activeKeywordList[0].display, reading: activeKeywordList[0].reading }]
          : currentTarget.tokens;

      setTypingState(createTypingState(nextTokens, prefs.textStyle));
      setStarted(false);
      setElapsedMs(0);
      setCorrectKeys(0);
      setErrorKeys(0);
      setHasRecentMistake(false);
      setImeWarning(false);
      setLastKeyPress(null);
      setCompletedRecord(null);
      setSessionMissedKeys({});
      setRevealedTokenIndices(new Set());
      setGaveUp(false);
      setHintsUsed(0);

      startTimeRef.current = null;
      keyDeltaRef.current = {};
      missedKeysRef.current = {};
      correctKeysRef.current = 0;
      errorKeysRef.current = 0;
      hintsUsedRef.current = 0;
    },
    [mode, activeKeywordList, currentTarget.tokens, prefs.textStyle]
  );

  // Reset whenever target, mode, or textStyle changes
  useEffect(() => {
    setKeywordIndex(0);
    setTypingState(createTypingState(currentTarget.tokens, prefs.textStyle));
    setStarted(false);
    setElapsedMs(0);
    setCorrectKeys(0);
    setErrorKeys(0);
    setHasRecentMistake(false);
    setImeWarning(false);
    setLastKeyPress(null);
    setCompletedRecord(null);
    setSessionMissedKeys({});
    setRevealedTokenIndices(new Set());
    setGaveUp(false);
    setHintsUsed(0);

    startTimeRef.current = null;
    keyDeltaRef.current = {};
    missedKeysRef.current = {};
    correctKeysRef.current = 0;
    errorKeysRef.current = 0;
    hintsUsedRef.current = 0;
  }, [mode, selectedSplitId, keywordPool, keywordSeed, memorizeScope, prefs.textStyle]);

  // Live timer loop while active
  useEffect(() => {
    if (!started || completedRecord || gaveUp) return;
    const id = window.setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedMs(performance.now() - startTimeRef.current);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [started, completedRecord, gaveUp]);

  // Keep active token scrolled comfortably into view for long passages
  useEffect(() => {
    if (activeTokenElRef.current) {
      activeTokenElRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [typingState.unitIndex]);

  // Complete a session & save record
  const finalizeSession = useCallback(
    (finalDurationMs: number, finalCorrect: number, finalErrors: number) => {
      const safeMs = Math.max(finalDurationMs, 250);
      const kpm = Math.round((finalCorrect / safeMs) * 60000);
      const wpm = Math.round(kpm / 5);
      const total = finalCorrect + finalErrors;
      const accuracy = total > 0 ? (finalCorrect / total) * 100 : 100;

      const record: TypingSessionRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        mode,
        targetId: currentTarget.id,
        targetTitle: currentTarget.title,
        kpm,
        wpm,
        accuracy,
        durationMs: safeMs,
        correctKeys: finalCorrect,
        errorKeys: finalErrors,
        hintsUsed: hintsUsedRef.current,
        textStyle: prefs.textStyle,
      };

      playCompleteChime(prefs.soundEnabled);
      setCompletedRecord(record);
      setSessionMissedKeys({ ...missedKeysRef.current });
      onRecordSession(record, keyDeltaRef.current);
    },
    [mode, currentTarget.id, currentTarget.title, prefs.textStyle, prefs.soundEnabled, onRecordSession]
  );

  // Advance to next section / reshuffle keywords
  const handleNext = useCallback(() => {
    if (mode === 'split') {
      const idx = PREAMBLE_SECTIONS.findIndex((s) => s.id === selectedSplitId);
      if (idx >= 0 && idx + 1 < PREAMBLE_SECTIONS.length) {
        setSelectedSplitId(PREAMBLE_SECTIONS[idx + 1].id);
      } else if (idx === PREAMBLE_SECTIONS.length - 1) {
        setSelectedSplitId('full');
      } else {
        setSelectedSplitId('sec-1');
      }
      return;
    }
    if (mode === 'keywords') {
      if (keywordPool === 'random10') {
        setKeywordSeed((s) => s + 1);
      } else {
        resetSession(true);
      }
      return;
    }
    if (mode === 'memorize') {
      const order: MemorizeScopeId[] = ['p1', 'p2', 'p3', 'p4', 'all'];
      const idx = order.indexOf(memorizeScope);
      if (idx >= 0 && idx + 1 < order.length) {
        setMemorizeScope(order[idx + 1]);
      } else {
        resetSession(true);
      }
    }
  }, [mode, selectedSplitId, keywordPool, memorizeScope, resetSession]);

  // Reveal hint in memorize mode
  const handleMemorizeHint = useCallback(() => {
    if (mode !== 'memorize' || completedRecord || gaveUp) return;
    const currentUnit = typingState.units[typingState.unitIndex];
    if (!currentUnit) return;
    const tokIdx = currentUnit.tokenIndex;
    setRevealedTokenIndices((prev) => {
      const next = new Set(prev);
      next.add(tokIdx);
      return next;
    });
    hintsUsedRef.current += 1;
    setHintsUsed(hintsUsedRef.current);
  }, [mode, completedRecord, gaveUp, typingState.units, typingState.unitIndex]);

  // Global keydown listener for zero-latency typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore browser/OS modifier shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Avoid hijacking keyboard when focused inside select/button?
      // Wait: if user clicks a toolbar button or select, blur it on typing or let Esc reset
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'SELECT') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        resetSession(true);
        return;
      }

      if (completedRecord) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      if (gaveUp) return;

      if (mode === 'memorize' && e.key === 'F1') {
        e.preventDefault();
        handleMemorizeHint();
        return;
      }

      // Detect active Japanese IME
      if (e.isComposing || e.key === 'Process') {
        setImeWarning(true);
        return;
      }

      // Single printable key check
      if (e.key.length !== 1) return;
      const lower = e.key.toLowerCase();
      if (!/^[a-z0-9,.'\-/]$/.test(lower)) return;

      e.preventDefault();
      setImeWarning(false);

      // Blur focused toolbar button so Space/Enter don't re-trigger it
      if (document.activeElement instanceof HTMLButtonElement) {
        document.activeElement.blur();
      }

      const result = processTypingKey(typingState, lower);
      if (result.outcome === 'ignored') return;

      // Start clock on first valid key
      if (!started) {
        startTimeRef.current = performance.now();
        setStarted(true);
      }

      const seq = Date.now() + Math.random();
      setLastKeyPress({ key: lower, outcome: result.outcome, seq });

      const statKey = result.expectedKey || lower;
      const existingStat = keyDeltaRef.current[statKey] ?? { hits: 0, misses: 0 };

      if (result.outcome === 'hit') {
        playKeyClick(prefs.soundEnabled);
        correctKeysRef.current += 1;
        setCorrectKeys(correctKeysRef.current);
        setHasRecentMistake(false);

        keyDeltaRef.current[statKey] = {
          hits: existingStat.hits + 1,
          misses: existingStat.misses,
        };

        setTypingState(result.nextState);

        if (result.nextState.finished) {
          // In keyword mode, seamlessly chain through the active list!
          if (mode === 'keywords' && keywordIndex + 1 < activeKeywordList.length) {
            const nextIdx = keywordIndex + 1;
            const nextWord = activeKeywordList[nextIdx];
            setKeywordIndex(nextIdx);
            setTypingState(
              createTypingState(
                [{ display: nextWord.display, reading: nextWord.reading }],
                prefs.textStyle
              )
            );
          } else {
            const finalMs =
              startTimeRef.current !== null ? performance.now() - startTimeRef.current : 500;
            setElapsedMs(finalMs);
            finalizeSession(finalMs, correctKeysRef.current, errorKeysRef.current);
          }
        }
      } else {
        // Typo
        playTypoSound(prefs.soundEnabled);
        errorKeysRef.current += 1;
        setErrorKeys(errorKeysRef.current);
        setHasRecentMistake(true);
        setShakeSeq((s) => s + 1);

        keyDeltaRef.current[statKey] = {
          hits: existingStat.hits,
          misses: existingStat.misses + 1,
        };
        missedKeysRef.current[statKey] = (missedKeysRef.current[statKey] ?? 0) + 1;

        if (prefs.strictMode) {
          // Sudden death mode: reset immediately on mistake
          resetSession(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    typingState,
    started,
    completedRecord,
    gaveUp,
    mode,
    keywordIndex,
    activeKeywordList,
    prefs.soundEnabled,
    prefs.strictMode,
    prefs.textStyle,
    resetSession,
    handleNext,
    handleMemorizeHint,
    finalizeSession,
  ]);

  // Compute live metrics
  const liveKpm =
    started && elapsedMs > 200 ? Math.round((correctKeys / elapsedMs) * 60000) : 0;
  const totalTyped = correctKeys + errorKeys;
  const liveAccuracy = totalTyped > 0 ? (correctKeys / totalTyped) * 100 : 100;

  // Identify current token index
  const currentUnit = typingState.units[typingState.unitIndex];
  const activeTokenIndex = currentUnit
    ? currentUnit.tokenIndex
    : typingState.tokenCharRanges.length;

  // Expected next key & romaji stream
  const expectedKey = getExpectedNextKey(typingState);
  const activeTokenRange = typingState.tokenCharRanges[activeTokenIndex];
  const activeTokenRemainingRomaji = activeTokenRange
    ? getRemainingRomajiForRange(typingState, activeTokenRange.start, activeTokenRange.end)
    : '';
  const upcomingRomaji = activeTokenRange
    ? getRemainingRomajiForRange(
        typingState,
        activeTokenRange.end,
        Math.min(typingState.units.length, activeTokenRange.end + 12)
      )
    : '';

  const showRomajiFocus =
    mode !== 'memorize' &&
    (prefs.romajiGuide === 'always' ||
      (prefs.romajiGuide === 'mistake' && hasRecentMistake));

  // Best KPM map for split sections
  const bestKpmByTarget = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      if (!map[s.targetId] || s.kpm > map[s.targetId]) {
        map[s.targetId] = s.kpm;
      }
    }
    return map;
  }, [sessions]);

  // Pace progress calculation
  const progressRatio =
    typingState.units.length > 0 ? typingState.unitIndex / typingState.units.length : 0;
  const estimatedTotalKeys = useMemo(() => {
    if (mode === 'keywords') {
      return activeKeywordList.reduce((acc, w) => acc + w.reading.length * 1.8, 0);
    }
    return Math.max(1, typingState.units.length * 1.8);
  }, [mode, activeKeywordList, typingState.units.length]);

  const paceRatio =
    prefs.paceTargetKpm > 0 && started
      ? Math.min(1, ((elapsedMs / 60000) * prefs.paceTargetKpm) / estimatedTotalKeys)
      : 0;

  // Split section next label
  const nextButtonLabel = useMemo(() => {
    if (mode === 'split') {
      const idx = PREAMBLE_SECTIONS.findIndex((s) => s.id === selectedSplitId);
      if (idx >= 0 && idx + 1 < PREAMBLE_SECTIONS.length) {
        return `第${idx + 2}節へ`;
      }
      if (idx === PREAMBLE_SECTIONS.length - 1) return '全文通しへ';
      return '第1節へ';
    }
    if (mode === 'keywords') return '次の10問へ';
    return '次の段落へ';
  }, [mode, selectedSplitId]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Mode Sub-Navigation */}
      <div className="mb-6">
        {mode === 'split' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E5E2DC] dark:border-neutral-800 pb-3">
              {PREAMBLE_SECTIONS.map((sec) => {
                const isSelected = selectedSplitId === sec.id;
                const best = bestKpmByTarget[sec.id];
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSplitId(sec.id)}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#1D3557] text-white dark:bg-[#EFECE6] dark:text-[#141413] font-medium'
                        : 'text-[#4A4742] dark:text-neutral-400 hover:bg-[#EFECE6] dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>第{sec.number}節</span>
                    {best ? (
                      <span
                        className={`font-mono-tabular text-[11px] ${
                          isSelected
                            ? 'text-white/80 dark:text-[#141413]/75'
                            : 'text-[#8C877E] dark:text-neutral-500'
                        }`}
                      >
                        {best}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedSplitId('full')}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedSplitId === 'full'
                    ? 'bg-[#1D3557] text-white dark:bg-[#EFECE6] dark:text-[#141413] font-medium'
                    : 'text-[#4A4742] dark:text-neutral-400 hover:bg-[#EFECE6] dark:hover:bg-neutral-800'
                }`}
              >
                <span>全文通し</span>
                {bestKpmByTarget['full'] ? (
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      selectedSplitId === 'full'
                        ? 'text-white/80 dark:text-[#141413]/75'
                        : 'text-[#8C877E] dark:text-neutral-500'
                    }`}
                  >
                    {bestKpmByTarget['full']}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        )}

        {mode === 'keywords' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DC] dark:border-neutral-800 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'random10', label: 'ランダム10問' },
                  { id: 'all', label: '全28語' },
                  { id: 'p1', label: '第一段落' },
                  { id: 'p2', label: '第二段落' },
                  { id: 'p34', label: '第三・四段落' },
                ] as { id: KeywordPoolId; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setKeywordPool(item.id);
                    if (item.id === 'random10') setKeywordSeed((s) => s + 1);
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded transition-colors whitespace-nowrap shrink-0 ${
                    keywordPool === item.id
                      ? 'bg-[#1D3557] text-white dark:bg-[#EFECE6] dark:text-[#141413] font-medium'
                      : 'text-[#4A4742] dark:text-neutral-400 hover:bg-[#EFECE6] dark:hover:bg-neutral-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="font-mono-tabular text-xs text-[#6B6760] dark:text-neutral-400">
              {keywordIndex + 1} / {activeKeywordList.length} 問
            </div>
          </div>
        )}

        {mode === 'memorize' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DC] dark:border-neutral-800 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'p1', label: '第一段落' },
                  { id: 'p2', label: '第二段落' },
                  { id: 'p3', label: '第三段落' },
                  { id: 'p4', label: '第四段落' },
                  { id: 'all', label: '前文すべて（全暗記）' },
                ] as { id: MemorizeScopeId; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMemorizeScope(item.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded transition-colors whitespace-nowrap shrink-0 ${
                    memorizeScope === item.id
                      ? 'bg-[#1D3557] text-white dark:bg-[#EFECE6] dark:text-[#141413] font-medium'
                      : 'text-[#4A4742] dark:text-neutral-400 hover:bg-[#EFECE6] dark:hover:bg-neutral-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setMemorizeHintMode((m) => (m === 'blank' ? 'initial' : 'blank'))
                }
                className="px-2.5 py-1 rounded border border-[#DFDCD5] dark:border-neutral-700 text-[#4A4742] dark:text-neutral-300 hover:bg-[#EFECE6] dark:hover:bg-neutral-800 transition-colors whitespace-nowrap"
              >
                {memorizeHintMode === 'blank' ? '表示: 完全白紙' : '表示: 頭文字あり'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compact Preferences Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs text-[#6B6760] dark:text-neutral-400 mb-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {/* Original vs Modern */}
          <div className="flex items-center gap-1.5">
            <span>表記:</span>
            <button
              type="button"
              onClick={() =>
                onUpdatePrefs({
                  textStyle: prefs.textStyle === 'original' ? 'modern' : 'original',
                })
              }
              className="font-medium text-[#1A1917] dark:text-neutral-200 hover:underline underline-offset-4 whitespace-nowrap"
            >
              {prefs.textStyle === 'original' ? '原文（やうに・わたつて）' : '現代仮名（ように・わたって）'}
            </button>
          </div>

          {mode !== 'memorize' && (
            <>
              <span aria-hidden="true" className="text-[#D4D0C8] dark:text-neutral-700">·</span>

              {/* Romaji guide */}
              <div className="flex items-center gap-1.5">
                <span>ローマ字:</span>
                <button
                  type="button"
                  onClick={() => {
                    const next =
                      prefs.romajiGuide === 'always'
                        ? 'mistake'
                        : prefs.romajiGuide === 'mistake'
                        ? 'never'
                        : 'always';
                    onUpdatePrefs({ romajiGuide: next });
                  }}
                  className="font-medium text-[#1A1917] dark:text-neutral-200 hover:underline underline-offset-4 whitespace-nowrap"
                >
                  {prefs.romajiGuide === 'always'
                    ? '常時表示'
                    : prefs.romajiGuide === 'mistake'
                    ? 'ミス時のみ'
                    : '非表示'}
                </button>
              </div>

              <span aria-hidden="true" className="text-[#D4D0C8] dark:text-neutral-700">·</span>

              {/* Furigana */}
              <button
                type="button"
                onClick={() => onUpdatePrefs({ showFurigana: !prefs.showFurigana })}
                className={`whitespace-nowrap hover:underline underline-offset-4 ${
                  prefs.showFurigana ? 'font-medium text-[#1A1917] dark:text-neutral-200' : ''
                }`}
              >
                ふりがな: {prefs.showFurigana ? '表示' : '非表示'}
              </button>

              <span aria-hidden="true" className="text-[#D4D0C8] dark:text-neutral-700">·</span>

              {/* Beginner Keyboard Guide */}
              <button
                type="button"
                onClick={() => onUpdatePrefs({ showKeyboard: !prefs.showKeyboard })}
                className={`whitespace-nowrap hover:underline underline-offset-4 ${
                  prefs.showKeyboard ? 'font-medium text-[#1D3557] dark:text-[#EFECE6]' : ''
                }`}
              >
                運指キーボード: {prefs.showKeyboard ? '表示' : '非表示'}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Pace Target Selector */}
          <label className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span>目標ペース:</span>
            <select
              value={prefs.paceTargetKpm}
              onChange={(e) => onUpdatePrefs({ paceTargetKpm: Number(e.target.value) })}
              className="bg-transparent font-mono-tabular font-medium text-[#1A1917] dark:text-neutral-200 focus:outline-none cursor-pointer"
            >
              <option value={0} className="dark:bg-neutral-900">なし</option>
              <option value={200} className="dark:bg-neutral-900">200 KPM（初級）</option>
              <option value={400} className="dark:bg-neutral-900">400 KPM（中級）</option>
              <option value={600} className="dark:bg-neutral-900">600 KPM（達人）</option>
              <option value={750} className="dark:bg-neutral-900">750 KPM（極位）</option>
            </select>
          </label>

          <span aria-hidden="true" className="text-[#D4D0C8] dark:text-neutral-700">·</span>

          {/* Strict mode */}
          <button
            type="button"
            onClick={() => onUpdatePrefs({ strictMode: !prefs.strictMode })}
            title="ミスした瞬間に最初からやり直す上級者向けモード"
            className={`whitespace-nowrap hover:underline underline-offset-4 ${
              prefs.strictMode ? 'font-medium text-[#B93829]' : ''
            }`}
          >
            一発勝負: {prefs.strictMode ? 'ON' : 'OFF'}
          </button>

          <span aria-hidden="true" className="text-[#D4D0C8] dark:text-neutral-700">·</span>

          {/* Sound toggle */}
          <button
            type="button"
            onClick={() => onUpdatePrefs({ soundEnabled: !prefs.soundEnabled })}
            aria-label={prefs.soundEnabled ? '打鍵音をオフ' : '打鍵音をオン'}
            className="inline-flex items-center gap-1 hover:text-[#1A1917] dark:hover:text-neutral-200 transition-colors whitespace-nowrap"
          >
            {prefs.soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>音</span>
          </button>
        </div>
      </div>

      {/* IME Warning */}
      {imeWarning && (
        <div
          role="alert"
          className="mb-5 px-4 py-2.5 text-sm border border-[#B93829]/40 bg-[#B93829]/5 text-[#B93829] rounded"
        >
          日本語入力（IME）が有効になっています。キーボードの「半角/全角」または「英数」キーで直接入力（半角英数）に切り替えてください。
        </div>
      )}

      {/* Result Screen or Active Typing Stage */}
      {completedRecord ? (
        <ResultPanel
          record={completedRecord}
          sessionMissedKeys={sessionMissedKeys}
          hasNext={true}
          nextLabel={nextButtonLabel}
          onRetry={() => resetSession(true)}
          onNext={handleNext}
          onViewAnalytics={onGoAnalytics}
        />
      ) : (
        <div>
          {/* Live Telemetry & Title Header */}
          <div className="flex flex-wrap items-end justify-between gap-4 pb-3 border-b border-[#E5E2DC] dark:border-neutral-800">
            <div>
              <h1 className="font-mincho text-lg sm:text-xl font-semibold text-[#1A1917] dark:text-[#EFECE6]">
                {currentTarget.title}
              </h1>
              {mode !== 'keywords' && (
                <p className="text-xs text-[#6B6760] dark:text-neutral-400 mt-0.5">
                  {currentTarget.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-baseline gap-5 font-mono-tabular">
              <div className="text-right">
                <span className="text-[11px] text-[#6B6760] dark:text-neutral-400 mr-1.5">KPM</span>
                <span className="text-xl font-semibold text-[#1D3557] dark:text-[#EFECE6]">
                  {liveKpm}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#6B6760] dark:text-neutral-400 mr-1.5">正確率</span>
                <span className="text-xl font-semibold text-[#1A1917] dark:text-[#EFECE6]">
                  {liveAccuracy.toFixed(0)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#6B6760] dark:text-neutral-400 mr-1.5">時間</span>
                <span className="text-xl font-semibold text-[#1A1917] dark:text-[#EFECE6]">
                  {(elapsedMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>

          {/* Progress & Optional Pace Maker Track */}
          <div className="relative mt-2 mb-6 space-y-1">
            <div className="h-[2px] w-full bg-[#E5E2DC] dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-[#1D3557] dark:bg-[#EFECE6] transition-all duration-100"
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
            {prefs.paceTargetKpm > 0 && (
              <div className="h-[2px] w-full bg-[#E5E2DC]/60 dark:bg-neutral-800/60 overflow-hidden">
                <div
                  className="h-full bg-[#B93829]/75 transition-all duration-100"
                  style={{ width: `${Math.round(paceRatio * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Active Word Romaji Focus Bar (Split & Keywords) */}
          {mode !== 'memorize' && (
            <div
              key={shakeSeq}
              className={`mb-5 min-h-[3.25rem] flex flex-col justify-center ${
                hasRecentMistake ? 'animate-typo-shake' : ''
              }`}
            >
              {activeTokenRange && (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-base sm:text-lg font-medium text-[#1A1917] dark:text-[#EFECE6]">
                    {activeTokenRange.reading}
                  </span>

                  {showRomajiFocus && (
                    <div className="font-mono-tabular text-base sm:text-lg tracking-wide flex items-center">
                      {typingState.buffer && (
                        <span className="text-[#9A958C] dark:text-neutral-500">
                          {typingState.buffer}
                        </span>
                      )}
                      {activeTokenRemainingRomaji && (
                        <>
                          <span
                            className={`px-0.5 rounded-xs font-semibold ${
                              hasRecentMistake
                                ? 'bg-[#B93829]/15 text-[#B93829] underline decoration-[#B93829] decoration-2 underline-offset-4'
                                : 'bg-[#1D3557]/12 text-[#1D3557] dark:bg-[#EFECE6]/15 dark:text-[#EFECE6] underline decoration-2 underline-offset-4'
                            }`}
                          >
                            {activeTokenRemainingRomaji[0]}
                          </span>
                          <span className="text-[#4A4742] dark:text-neutral-300">
                            {activeTokenRemainingRomaji.slice(1)}
                          </span>
                        </>
                      )}
                      {upcomingRomaji && (
                        <span className="text-[#A6A198] dark:text-neutral-600 ml-1.5">
                          {upcomingRomaji}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MAIN TYPING STAGE */}
          {mode === 'keywords' ? (
            /* Key Vocabulary Focused Stage */
            <div className="py-10 sm:py-14 text-center">
              <div className="font-mincho text-3xl sm:text-5xl font-medium tracking-wider text-[#1A1917] dark:text-[#EFECE6] mb-4">
                {resolveToken(currentTarget.tokens[0], prefs.textStyle).display}
              </div>
              <p className="text-sm sm:text-base text-[#6B6760] dark:text-neutral-400 max-w-lg mx-auto leading-relaxed">
                {currentTarget.subtitle}
              </p>
              {!started && (
                <p className="mt-8 text-xs text-[#8C877E] dark:text-neutral-500">
                  最初のキーを押すと計測が始まります（Esc でリセット）
                </p>
              )}
            </div>
          ) : mode === 'memorize' ? (
            /* Memorization Challenge Manuscript */
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs text-[#6B6760] dark:text-neutral-400">
                <span>
                  {started
                    ? `進捗: ${activeTokenIndex} / ${typingState.tokenCharRanges.length} 文節 · ヒント使用 ${hintsUsed}回`
                    : '白紙の状態から記憶を頼りにローマ字で打鍵してください。正打すると文字が現れます。'}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleMemorizeHint}
                    disabled={gaveUp}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#DFDCD5] dark:border-neutral-700 hover:bg-[#EFECE6] dark:hover:bg-neutral-800 text-[#1A1917] dark:text-neutral-200 disabled:opacity-40 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>1文節ヒント（F1）</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGaveUp((g) => !g)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#DFDCD5] dark:border-neutral-700 hover:bg-[#EFECE6] dark:hover:bg-neutral-800 text-[#4A4742] dark:text-neutral-300 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{gaveUp ? '隠す' : '答え合わせ'}</span>
                  </button>
                </div>
              </div>

              <div
                key={shakeSeq}
                className={`font-mincho text-xl sm:text-2xl leading-[2.3] tracking-wide max-h-[420px] overflow-y-auto pr-2 py-4 ${
                  hasRecentMistake ? 'animate-typo-shake' : ''
                }`}
              >
                {typingState.tokenCharRanges.map((tok, idx) => {
                  const isDone = idx < activeTokenIndex;
                  const isCurrent = idx === activeTokenIndex;
                  const isHinted = revealedTokenIndices.has(idx);

                  if (isDone || gaveUp) {
                    return (
                      <span
                        key={idx}
                        className={
                          isDone
                            ? 'text-[#1A1917] dark:text-[#EFECE6]'
                            : 'text-[#9A958C] dark:text-neutral-500'
                        }
                      >
                        {tok.display}
                      </span>
                    );
                  }

                  if (isHinted) {
                    return (
                      <span
                        key={idx}
                        ref={isCurrent ? activeTokenElRef : null}
                        className={`text-[#1D3557] dark:text-[#93C5FD] ${
                          isCurrent ? 'border-b-2 border-[#1D3557] dark:border-[#EFECE6]' : ''
                        }`}
                      >
                        {tok.display}
                      </span>
                    );
                  }

                  if (isCurrent) {
                    const completedKanaInToken = typingState.units
                      .slice(tok.start, typingState.unitIndex)
                      .map((u) => u.kana)
                      .join('');
                    const remainingCount = Math.max(0, tok.end - typingState.unitIndex);
                    return (
                      <span
                        key={idx}
                        ref={activeTokenElRef}
                        className="inline-flex items-center mx-0.5 px-1.5 border-b-2 border-[#1D3557] dark:border-[#EFECE6] bg-[#1D3557]/8 dark:bg-[#EFECE6]/10 text-[#1D3557] dark:text-[#EFECE6]"
                      >
                        {memorizeHintMode === 'initial' ? (
                          <span>
                            {tok.display[0]}
                            {completedKanaInToken && (
                              <span className="font-sans text-sm opacity-75 ml-1">
                                {completedKanaInToken}
                              </span>
                            )}
                            {typingState.buffer && (
                              <span className="font-mono-tabular text-sm opacity-80 ml-0.5">
                                {typingState.buffer}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="font-sans text-base sm:text-lg py-0.5">
                            {completedKanaInToken && <span>{completedKanaInToken}</span>}
                            {typingState.buffer && (
                              <span className="font-mono-tabular text-sm opacity-80">
                                {typingState.buffer}
                              </span>
                            )}
                            {!completedKanaInToken && !typingState.buffer && (
                              <span className="text-[#9A958C] dark:text-neutral-500">
                                {'＿'.repeat(Math.min(4, Math.max(1, remainingCount)))}
                              </span>
                            )}
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="inline-block w-[2px] h-5 bg-[#1D3557] dark:bg-[#EFECE6] ml-0.5 animate-cursor-blink"
                        />
                      </span>
                    );
                  }

                  return (
                    <span
                      key={idx}
                      className="text-[#D4D0C8] dark:text-neutral-700 select-none"
                    >
                      {memorizeHintMode === 'initial'
                        ? tok.display[0] + '＿'.repeat(Math.max(0, tok.display.length - 1))
                        : '＿'.repeat(tok.display.length)}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Split / Full Text Practice Manuscript */
            <div className="font-mincho text-xl sm:text-[26px] leading-[2.4] tracking-wide max-h-[420px] overflow-y-auto pr-2 py-2">
              {typingState.tokenCharRanges.map((tok, idx) => {
                const isDone = idx < activeTokenIndex;
                const isCurrent = idx === activeTokenIndex;
                const needsRuby = prefs.showFurigana && tok.display !== tok.reading;

                return (
                  <span
                    key={idx}
                    ref={isCurrent ? activeTokenElRef : null}
                    className={`transition-colors duration-75 ${
                      isDone
                        ? 'text-[#1A1917] dark:text-[#EFECE6]'
                        : isCurrent
                        ? 'text-[#1D3557] dark:text-white bg-[#1D3557]/8 dark:bg-white/10 border-b-2 border-[#1D3557] dark:border-[#EFECE6] px-0.5 rounded-t-xs'
                        : 'text-[#9A958C] dark:text-neutral-500'
                    }`}
                  >
                    {needsRuby ? (
                      <ruby>
                        {tok.display}
                        <rt className="font-sans text-[11px] font-normal tracking-normal select-none opacity-75">
                          {tok.reading}
                        </rt>
                      </ruby>
                    ) : (
                      tok.display
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Bottom Action & Prompt Hint */}
          <div className="mt-6 pt-4 border-t border-[#E5E2DC] dark:border-neutral-800 flex items-center justify-between text-xs text-[#6B6760] dark:text-neutral-400">
            <span>
              {!started
                ? 'キーボードを打つと自動で開始します'
                : `進捗: ${activeTokenIndex} / ${typingState.tokenCharRanges.length} 文節`}
            </span>

            <button
              type="button"
              onClick={() => resetSession(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#DFDCD5] dark:border-neutral-700 text-[#4A4742] dark:text-neutral-300 hover:bg-[#EFECE6] dark:hover:bg-neutral-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>やり直す（Esc）</span>
            </button>
          </div>

          {/* Beginner Finger-Guide Keyboard */}
          {prefs.showKeyboard && mode !== 'memorize' && (
            <div className="mt-6">
              <KeyboardGuide expectedKey={expectedKey} lastKeyPress={lastKeyPress} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
