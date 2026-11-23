export type PracticeMode = 'split' | 'memorize';
type StoredPracticeMode = PracticeMode | 'keywords';

export interface TypingSessionRecord {
  id: string;
  timestamp: number;
  mode: StoredPracticeMode;
  targetId: string;
  targetTitle: string;
  kpm: number;
  wpm: number;
  accuracy: number;
  durationMs: number;
  correctKeys: number;
  errorKeys: number;
  hintsUsed: number;
  textStyle: 'original' | 'modern';
}

export interface KeyStat {
  hits: number;
  misses: number;
}

export interface UserPreferences {
  showKeyboard: boolean;
  romajiGuide: 'always' | 'mistake' | 'never';
  showFurigana: boolean;
  textStyle: 'original' | 'modern';
  paceTargetKpm: number;
  soundEnabled: boolean;
  strictMode: boolean;
  theme: 'light' | 'dark';
}

const SESSIONS_KEY = 'kenpo_typing_sessions_v1';
const KEY_STATS_KEY = 'kenpo_typing_key_stats_v1';
const PREFS_KEY = 'kenpo_typing_prefs_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  showKeyboard: false,
  romajiGuide: 'always',
  showFurigana: true,
  textStyle: 'original',
  paceTargetKpm: 0,
  soundEnabled: false,
  strictMode: false,
  theme: 'light',
};

export function loadSessions(): TypingSessionRecord[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(record: TypingSessionRecord): TypingSessionRecord[] {
  const current = loadSessions();
  const next = [...current, record].slice(-500);
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function loadKeyStats(): Record<string, KeyStat> {
  try {
    const raw = localStorage.getItem(KEY_STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function mergeKeyStats(
  delta: Record<string, KeyStat>
): Record<string, KeyStat> {
  const current = loadKeyStats();
  const next: Record<string, KeyStat> = { ...current };
  for (const [k, v] of Object.entries(delta)) {
    const existing = next[k] ?? { hits: 0, misses: 0 };
    next[k] = {
      hits: existing.hits + v.hits,
      misses: existing.misses + v.misses,
    };
  }
  try {
    localStorage.setItem(KEY_STATS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function clearAllProgress(): void {
  try {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(KEY_STATS_KEY);
  } catch {
    // Ignore
  }
}

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
}

export function getSkillRank(kpm: number): { label: string; description: string } {
  if (kpm >= 750) return { label: '極位（750 KPM超）', description: '競技タイパー水準の圧巻の打鍵速度' };
  if (kpm >= 600) return { label: '達人（600 KPM超）', description: '思考と指が直結する高速タイピング' };
  if (kpm >= 450) return { label: '上級（450 KPM超）', description: '迷いのない滑らかなタッチタイピング' };
  if (kpm >= 300) return { label: '中級（300 KPM超）', description: '実務でも余裕のある安定した速度' };
  if (kpm >= 180) return { label: '初級（180 KPM超）', description: '基本の運指が定着してきた段階' };
  return { label: '入門', description: '一文字ずつ位置を確かめながら着実に習得中' };
}
