const SESSIONS_KEY = "kenpo_typing_sessions_v1";
const KEY_STATS_KEY = "kenpo_typing_key_stats_v1";
const PREFS_KEY = "kenpo_typing_prefs_v1";
const DEFAULT_PREFERENCES = {
  showKeyboard: false,
  romajiGuide: "always",
  showFurigana: true,
  textStyle: "original",
  paceTargetKpm: 0,
  soundEnabled: false,
  strictMode: false,
  theme: "light"
};
function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveSession(record) {
  const current = loadSessions();
  const next = [...current, record].slice(-500);
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  } catch {
  }
  return next;
}
function loadKeyStats() {
  try {
    const raw = localStorage.getItem(KEY_STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function mergeKeyStats(delta) {
  const current = loadKeyStats();
  const next = { ...current };
  for (const [k, v] of Object.entries(delta)) {
    const existing = next[k] ?? { hits: 0, misses: 0 };
    next[k] = {
      hits: existing.hits + v.hits,
      misses: existing.misses + v.misses
    };
  }
  try {
    localStorage.setItem(KEY_STATS_KEY, JSON.stringify(next));
  } catch {
  }
  return next;
}
function clearAllProgress() {
  try {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(KEY_STATS_KEY);
  } catch {
  }
}
function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
function savePreferences(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
  }
}
function getSkillRank(kpm) {
  if (kpm >= 750) return { label: "\u6975\u4F4D\uFF08750 KPM\u8D85\uFF09", description: "\u7AF6\u6280\u30BF\u30A4\u30D1\u30FC\u6C34\u6E96\u306E\u5727\u5DFB\u306E\u6253\u9375\u901F\u5EA6" };
  if (kpm >= 600) return { label: "\u9054\u4EBA\uFF08600 KPM\u8D85\uFF09", description: "\u601D\u8003\u3068\u6307\u304C\u76F4\u7D50\u3059\u308B\u9AD8\u901F\u30BF\u30A4\u30D4\u30F3\u30B0" };
  if (kpm >= 450) return { label: "\u4E0A\u7D1A\uFF08450 KPM\u8D85\uFF09", description: "\u8FF7\u3044\u306E\u306A\u3044\u6ED1\u3089\u304B\u306A\u30BF\u30C3\u30C1\u30BF\u30A4\u30D4\u30F3\u30B0" };
  if (kpm >= 300) return { label: "\u4E2D\u7D1A\uFF08300 KPM\u8D85\uFF09", description: "\u5B9F\u52D9\u3067\u3082\u4F59\u88D5\u306E\u3042\u308B\u5B89\u5B9A\u3057\u305F\u901F\u5EA6" };
  if (kpm >= 180) return { label: "\u521D\u7D1A\uFF08180 KPM\u8D85\uFF09", description: "\u57FA\u672C\u306E\u904B\u6307\u304C\u5B9A\u7740\u3057\u3066\u304D\u305F\u6BB5\u968E" };
  return { label: "\u5165\u9580", description: "\u4E00\u6587\u5B57\u305A\u3064\u4F4D\u7F6E\u3092\u78BA\u304B\u3081\u306A\u304C\u3089\u7740\u5B9F\u306B\u7FD2\u5F97\u4E2D" };
}
export {
  DEFAULT_PREFERENCES,
  clearAllProgress,
  getSkillRank,
  loadKeyStats,
  loadPreferences,
  loadSessions,
  mergeKeyStats,
  savePreferences,
  saveSession
};
