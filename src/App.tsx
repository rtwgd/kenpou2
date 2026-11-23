import { useCallback, useEffect, useState } from 'react';
import { AnalyticsView } from './components/AnalyticsView';
import { ActiveTab, Header } from './components/Header';
import { PracticeView } from './components/PracticeView';
import {
  clearAllProgress,
  KeyStat,
  loadKeyStats,
  loadPreferences,
  loadSessions,
  mergeKeyStats,
  PracticeMode,
  savePreferences,
  saveSession,
  TypingSessionRecord,
  UserPreferences,
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('split');
  const [jumpSectionId, setJumpSectionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<TypingSessionRecord[]>(() => loadSessions());
  const [keyStats, setKeyStats] = useState<Record<string, KeyStat>>(() => loadKeyStats());
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences());

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [prefs.theme]);

  const handleUpdatePrefs = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    handleUpdatePrefs({ theme: prefs.theme === 'light' ? 'dark' : 'light' });
  }, [prefs.theme, handleUpdatePrefs]);

  const handleRecordSession = useCallback(
    (record: TypingSessionRecord, keyDelta: Record<string, KeyStat>) => {
      const nextSessions = saveSession(record);
      const nextStats = mergeKeyStats(keyDelta);
      setSessions(nextSessions);
      setKeyStats(nextStats);
    },
    []
  );

  const handleClearProgress = useCallback(() => {
    clearAllProgress();
    setSessions([]);
    setKeyStats({});
  }, []);

  const handleJumpToSection = useCallback((sectionId: string) => {
    setJumpSectionId(sectionId);
    setActiveTab('split');
  }, []);

  const handleStartPractice = useCallback((mode: PracticeMode) => {
    setActiveTab(mode);
  }, []);

  const applyBeginnerPreset = useCallback(() => {
    handleUpdatePrefs({
      showKeyboard: true,
      romajiGuide: 'always',
      showFurigana: true,
      paceTargetKpm: 200,
      strictMode: false,
    });
  }, [handleUpdatePrefs]);

  const applyExpertPreset = useCallback(() => {
    handleUpdatePrefs({
      showKeyboard: false,
      romajiGuide: 'mistake',
      showFurigana: false,
      paceTargetKpm: 600,
      strictMode: false,
    });
  }, [handleUpdatePrefs]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F4] text-[#1A1917] dark:bg-[#141413] dark:text-[#EFECE6] transition-colors">
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setJumpSectionId(undefined);
          setActiveTab(tab);
        }}
        theme={prefs.theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1">
        {activeTab === 'analytics' ? (
          <AnalyticsView
            sessions={sessions}
            keyStats={keyStats}
            onJumpToSection={handleJumpToSection}
            onStartPractice={handleStartPractice}
            onClearProgress={handleClearProgress}
          />
        ) : (
          <PracticeView
            mode={activeTab}
            prefs={prefs}
            onUpdatePrefs={handleUpdatePrefs}
            sessions={sessions}
            onRecordSession={handleRecordSession}
            onGoAnalytics={() => setActiveTab('analytics')}
            initialSectionId={jumpSectionId}
          />
        )}
      </main>

      <footer className="border-t border-[#E5E2DC] dark:border-neutral-800 py-4 px-4 sm:px-6 text-xs text-[#78756E] dark:text-neutral-500">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>一括設定:</span>
            <button
              type="button"
              onClick={applyBeginnerPreset}
              className="hover:text-[#1A1917] dark:hover:text-neutral-200 underline underline-offset-4 transition-colors"
            >
              初心者向け（運指・ローマ字ガイド）
            </button>
            <button
              type="button"
              onClick={applyExpertPreset}
              className="hover:text-[#1A1917] dark:hover:text-neutral-200 underline underline-offset-4 transition-colors"
            >
              上級者向け（600 KPM基準）
            </button>
          </div>

          <div className="font-mono-tabular">
            Esc やり直し · Enter 次へ · F1 暗記ヒント
          </div>
        </div>
      </footer>
    </div>
  );
}
