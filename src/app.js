import { PREAMBLE_SECTIONS } from './data/preamble.js';
import {
  createTypingState,
  getExpectedNextKey,
  getRemainingRomajiForRange,
  processTypingKey,
} from './utils/romaji.js';
import { playCompleteChime, playKeyClick, playTypoSound } from './utils/sound.js';
import {
  getSkillRank,
  clearAllProgress,
  loadKeyStats,
  loadPreferences,
  loadSessions,
  mergeKeyStats,
  savePreferences,
  saveSession,
} from './utils/storage.js';

const app = document.querySelector('#app');
const allTokens = PREAMBLE_SECTIONS.flatMap((section) => section.tokens);
const state = {
  mode: 'split',
  sectionId: 'sec-1',
  memorizeScope: 'p1',
  memorizeHintMode: 'blank',
  revealedTokens: new Set(),
  showAnswer: false,
  hintsUsed: 0,
  typing: createTypingState(PREAMBLE_SECTIONS[0].tokens, 'original'),
  prefs: loadPreferences(),
  sessions: loadSessions(),
  keyStats: loadKeyStats(),
  startedAt: null,
  elapsedMs: 0,
  correct: 0,
  errors: 0,
  missedKeys: {},
  keyDelta: {},
  lastKey: null,
  recentMistake: false,
  imeWarning: false,
  completed: null,
  filter: 'all',
  clearConfirm: false,
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const modeNames = { split: '分割練習', memorize: '全暗記挑戦', keywords: '過去のモード' };

function currentTarget() {
  if (state.mode === 'split') {
    if (state.sectionId === 'full') {
      return { id: 'full', title: '日本国憲法前文（全文通し）', subtitle: '第一段落〜第四段落・全8節', tokens: allTokens };
    }
    if (state.mode === 'memorize' && state.showAnswer) return;
    const section = PREAMBLE_SECTIONS.find((item) => item.id === state.sectionId) ?? PREAMBLE_SECTIONS[0];
    return { id: section.id, title: section.title, subtitle: section.summary, tokens: section.tokens };
  }
  if (state.memorizeScope === 'all') {
    return { id: 'mem-all', title: '全暗記挑戦（前文すべて）', subtitle: '第一段落〜第四段落', tokens: allTokens };
  }
  const paragraph = Number(state.memorizeScope.slice(1));
  const sections = PREAMBLE_SECTIONS.filter((section) => section.paragraph === paragraph);
  return {
    id: `mem-p${paragraph}`,
    title: `全暗記挑戦（第${['', '一', '二', '三', '四'][paragraph]}段落）`,
    subtitle: sections.map((section) => section.title).join(' / '),
    tokens: sections.flatMap((section) => section.tokens),
  };
}

function resetSession() {
  state.typing = createTypingState(currentTarget().tokens, state.prefs.textStyle);
  state.startedAt = null;
  state.elapsedMs = 0;
  state.correct = 0;
  state.errors = 0;
  state.missedKeys = {};
  state.keyDelta = {};
  state.lastKey = null;
  state.recentMistake = false;
  state.imeWarning = false;
  state.completed = null;
  state.revealedTokens = new Set();
  state.showAnswer = false;
  state.hintsUsed = 0;
}

function applyPreferences(patch) {
  state.prefs = { ...state.prefs, ...patch };
  savePreferences(state.prefs);
  if (patch.textStyle) resetSession();
  applyTheme();
  render();
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', state.prefs.theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', state.prefs.theme === 'dark' ? '#171b21' : '#f7f8fa',
  );
}

function switchMode(mode) {
  state.mode = mode;
  state.imeWarning = false;
  resetSession();
  render();
}

function getSectionChoices() {
  const best = {};
  for (const session of state.sessions) {
    best[session.targetId] = Math.max(best[session.targetId] ?? 0, session.kpm);
  }
  return `${PREAMBLE_SECTIONS.map((section) => `
    <button class="section-choice" type="button" data-section="${section.id}" aria-pressed="${state.sectionId === section.id}">
      <strong>第${section.number}節</strong><small>${escapeHtml(section.title.replace(/^[一二三四五六七八]、/, ''))}${best[section.id] ? ` · ${best[section.id]} KPM` : ''}</small>
    </button>`).join('')}
    <button class="section-choice" type="button" data-section="full" aria-pressed="${state.sectionId === 'full'}">
      <strong>全文通し</strong><small>${best.full ? `${best.full} KPM` : '全8節を続けて練習'}</small>
    </button>`;
}

function renderSettings() {
  const prefs = state.prefs;
  const guideName = { always: '常時表示', mistake: 'ミス時のみ', never: '非表示' }[prefs.romajiGuide];
  return `<details class="settings">
    <summary>練習設定</summary>
    <div class="settings-body">
      <label class="setting">表記
        <select data-pref="textStyle">
          <option value="original" ${prefs.textStyle === 'original' ? 'selected' : ''}>原文（旧仮名）</option>
          <option value="modern" ${prefs.textStyle === 'modern' ? 'selected' : ''}>現代仮名</option>
        </select>
      </label>
      ${state.mode !== 'memorize' ? `
        <label class="setting">ローマ字
          <select data-pref="romajiGuide">
            <option value="always" ${prefs.romajiGuide === 'always' ? 'selected' : ''}>常時表示</option>
            <option value="mistake" ${prefs.romajiGuide === 'mistake' ? 'selected' : ''}>ミス時のみ</option>
            <option value="never" ${prefs.romajiGuide === 'never' ? 'selected' : ''}>非表示</option>
          </select>
        </label>
        <button class="button" type="button" data-action="furigana">ふりがな ${prefs.showFurigana ? '表示中' : '非表示'}</button>
        <button class="button" type="button" data-action="keyboard">運指キーボード ${prefs.showKeyboard ? '表示中' : '非表示'}</button>
      ` : `<span class="helper-text">暗記中のローマ字ガイド: ${escapeHtml(guideName)}</span>`}
      <label class="setting">目標ペース
        <select data-pref="paceTargetKpm">
          <option value="0" ${prefs.paceTargetKpm === 0 ? 'selected' : ''}>なし</option>
          <option value="200" ${prefs.paceTargetKpm === 200 ? 'selected' : ''}>200 KPM</option>
          <option value="400" ${prefs.paceTargetKpm === 400 ? 'selected' : ''}>400 KPM</option>
          <option value="600" ${prefs.paceTargetKpm === 600 ? 'selected' : ''}>600 KPM</option>
          <option value="750" ${prefs.paceTargetKpm === 750 ? 'selected' : ''}>750 KPM</option>
        </select>
      </label>
      <button class="button" type="button" data-action="strict">一発勝負 ${prefs.strictMode ? 'ON' : 'OFF'}</button>
      <button class="button" type="button" data-action="sound">打鍵音 ${prefs.soundEnabled ? 'ON' : 'OFF'}</button>
    </div>
  </details>`;
}

function renderRomajiPrompt(activeRange) {
  if (state.mode === 'memorize' || !activeRange) return '';
  const showGuide = state.prefs.romajiGuide === 'always'
    || (state.prefs.romajiGuide === 'mistake' && state.recentMistake);
  const remaining = getRemainingRomajiForRange(state.typing, activeRange.start, activeRange.end);
  const upcoming = getRemainingRomajiForRange(
    state.typing, activeRange.end, Math.min(state.typing.units.length, activeRange.end + 12),
  );
  return `<div class="target-prompt">${escapeHtml(activeRange.reading)}${showGuide ? `
    <span class="romaji-line"><span class="typed">${escapeHtml(state.typing.buffer)}</span><span class="next">${escapeHtml(remaining[0] ?? '')}</span>${escapeHtml(remaining.slice(1))}<span class="helper-text"> ${escapeHtml(upcoming)}</span></span>` : ''}</div>`;
}

function renderTextStage(activeIndex) {
  const { tokenCharRanges, units, unitIndex } = state.typing;
  if (state.mode !== 'memorize') {
    return `<div class="text-stage" aria-label="練習する文章">${tokenCharRanges.map((token, index) => {
      const status = index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming';
      const ruby = state.prefs.showFurigana && token.display !== token.reading
        ? `<ruby>${escapeHtml(token.display)}<rt>${escapeHtml(token.reading)}</rt></ruby>`
        : escapeHtml(token.display);
      return `<span class="text-token ${status}" ${index === activeIndex ? 'data-active-token' : ''}>${ruby}</span>`;
    }).join('')}</div>`;
  }

  const content = tokenCharRanges.map((token, index) => {
    const done = index < activeIndex;
    const current = index === activeIndex;
    const hinted = state.revealedTokens.has(index);
    if (done || state.showAnswer) return `<span class="text-token ${done ? 'done' : 'upcoming'}">${escapeHtml(token.display)}</span>`;
    if (hinted && !current) return `<span class="text-token hinted">${escapeHtml(token.display)}</span>`;
    if (current) {
      const spoken = units.slice(token.start, unitIndex).map((unit) => unit.kana).join('');
      const blanks = '＿'.repeat(Math.min(4, Math.max(1, token.end - unitIndex)));
      const content = state.memorizeHintMode === 'initial'
        ? `${escapeHtml(token.display[0] ?? '')}${state.started ? ` <small>${escapeHtml(spoken)}</small>` : '＿'.repeat(Math.max(0, token.display.length - 1))}`
        : `${escapeHtml(spoken)}${state.typing.buffer ? `<small>${escapeHtml(state.typing.buffer)}</small>` : spoken ? '' : blanks}`;
      return `<span class="text-token current" data-active-token>${content}<span class="sr-only">${escapeHtml(token.display)}</span></span>`;
    }
    if (hinted) return `<span class="text-token hinted">${escapeHtml(token.display)}</span>`;
    const placeholder = state.memorizeHintMode === 'initial'
      ? `${escapeHtml(token.display[0] ?? '')}${'＿'.repeat(Math.max(0, token.display.length - 1))}`
      : '＿'.repeat(token.display.length);
    return `<span class="text-token upcoming">${placeholder}</span>`;
  }).join('');
  return `<p class="memorize-note">${state.started
    ? `進捗 ${activeIndex} / ${tokenCharRanges.length} 文節 · ヒント ${state.hintsUsed ?? 0}回`
    : '記憶を頼りにローマ字で打鍵してください。正しく打つと文字が現れます。'}</p>
    <div class="text-stage memorize-stage" aria-label="暗記する文章">${content}</div>`;
}

function keyboardMarkup() {
  const rows = ['qwertyuiop-', 'asdfghjkl;', 'zxcvbnm,./'];
  const expected = getExpectedNextKey(state.typing);
  return `<div class="keyboard-guide">
    <div class="keyboard-caption"><span>運指ガイド · F・J がホームポジション</span><strong>次のキー: ${escapeHtml(expected.toUpperCase() || '—')}</strong></div>
    <div class="keyboard">${rows.map((row) => `<div class="key-row">${[...row].map((key) => `<span class="key ${key === expected ? 'expected' : ''} ${state.lastKey?.key === key && state.lastKey.outcome === 'typo' ? 'mistake' : ''}">${key.toUpperCase()}</span>`).join('')}</div>`).join('')}</div>
  </div>`;
}

function nextLabel() {
  if (state.mode === 'memorize') return '次の段落へ';
  const index = PREAMBLE_SECTIONS.findIndex((section) => section.id === state.sectionId);
  if (index >= 0 && index < PREAMBLE_SECTIONS.length - 1) return `第${index + 2}節へ`;
  if (index === PREAMBLE_SECTIONS.length - 1) return '全文通しへ';
  return '第1節へ';
}

function renderResult() {
  const record = state.completed;
  const rank = getSkillRank(record.kpm);
  const missed = Object.entries(state.missedKeys).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `<section class="surface result" aria-live="polite">
    <p class="eyebrow">${escapeHtml(modeNames[record.mode])} · ${escapeHtml(record.targetTitle)}</p>
    <h2 class="result-title">打鍵完了 — ${escapeHtml(rank.label)}</h2>
    <p class="subheading">${escapeHtml(rank.description)}</p>
    ${record.mode === 'memorize' ? `<p class="helper-text">${record.hintsUsed === 0 ? 'ノーヒント暗記達成' : `ヒント使用 ${record.hintsUsed}回`}</p>` : ''}
    <div class="result-metrics">
      <div><span class="metric-label">打鍵速度</span><strong class="metric-value">${record.kpm}</strong><span class="metric-label">KPM</span></div>
      <div><span class="metric-label">正確率</span><strong class="metric-value">${record.accuracy.toFixed(1)}</strong><span class="metric-label">%</span></div>
      <div><span class="metric-label">所要時間</span><strong class="metric-value">${(record.durationMs / 1000).toFixed(1)}</strong><span class="metric-label">秒</span></div>
      <div><span class="metric-label">正打 / 誤打</span><strong class="metric-value">${record.correctKeys} / ${record.errorKeys}</strong></div>
    </div>
    ${missed.length ? `<p class="helper-text">今回の誤打キー: ${missed.map(([key, count]) => `${escapeHtml(key.toUpperCase())} (${count}回)`).join(' · ')}</p>` : ''}
    <div class="result-actions"><div class="action-group">
      <button class="button" type="button" data-action="retry">もう一度（Esc）</button>
      <button class="button primary" type="button" data-action="next">${escapeHtml(nextLabel())}（Enter）</button>
    </div><button class="button" type="button" data-action="analytics">学習グラフで推移を見る</button></div>
  </section>`;
}

function renderPractice() {
  const target = currentTarget();
  const currentUnit = state.typing.units[state.typing.unitIndex];
  const activeIndex = currentUnit ? currentUnit.tokenIndex : state.typing.tokenCharRanges.length;
  const activeRange = state.typing.tokenCharRanges[activeIndex];
  const progress = state.typing.units.length
    ? Math.round((state.typing.unitIndex / state.typing.units.length) * 100) : 0;
  const total = state.correct + state.errors;
  const accuracy = total ? Math.round((state.correct / total) * 100) : 100;
  const kpm = state.startedAt && state.elapsedMs > 200 ? Math.round(state.correct / state.elapsedMs * 60000) : 0;
  const pace = state.prefs.paceTargetKpm && state.startedAt
    ? Math.min(100, Math.round((state.elapsedMs / 60000 * state.prefs.paceTargetKpm) / Math.max(1, state.typing.units.length * 1.8) * 100))
    : 0;

  return `<div class="page-heading"><p class="eyebrow">${state.mode === 'split' ? '少しずつ、確実に' : '記憶をたどって入力'}</p>
    <h1>${state.mode === 'split' ? '分割練習' : '全暗記挑戦'}</h1>
    <p class="subheading">日本国憲法前文を、落ち着いて練習しましょう。</p></div>
    <div class="mode-picker" aria-label="練習方法">
      <button class="choice-button" type="button" data-mode="split" aria-pressed="${state.mode === 'split'}">分割練習</button>
      <button class="choice-button" type="button" data-mode="memorize" aria-pressed="${state.mode === 'memorize'}">全暗記挑戦</button>
    </div>
    ${state.mode === 'split' ? `<div class="section-choices" aria-label="練習する節">${getSectionChoices()}</div>`
      : `<div class="mode-picker" aria-label="暗記する範囲">${[
        ['p1', '第一段落'], ['p2', '第二段落'], ['p3', '第三段落'], ['p4', '第四段落'], ['all', '前文すべて'],
      ].map(([id, label]) => `<button class="choice-button" type="button" data-scope="${id}" aria-pressed="${state.memorizeScope === id}">${label}</button>`).join('')}
      <button class="choice-button" type="button" data-action="hint-style">${state.memorizeHintMode === 'blank' ? '完全白紙' : '頭文字あり'}</button></div>`}
    ${renderSettings()}
    ${state.imeWarning ? '<div class="alert" role="alert">日本語入力（IME）が有効です。「半角/全角」または「英数」キーで半角英数に切り替えてください。</div>' : ''}
    ${state.completed ? renderResult() : `<section class="surface practice-card">
      <div class="practice-topline"><div><h2 class="practice-title">${escapeHtml(target.title)}</h2><p class="subheading">${escapeHtml(target.subtitle)}</p></div>
        <div class="live-stats"><div class="live-stat"><span>打鍵速度</span><strong data-live-kpm>${kpm}</strong></div>
          <div class="live-stat"><span>正確率</span><strong data-live-accuracy>${accuracy}%</strong></div>
          <div class="live-stat"><span>時間</span><strong data-live-time>${(state.elapsedMs / 1000).toFixed(1)}s</strong></div></div></div>
      <div class="progress-track" role="progressbar" aria-label="練習の進捗" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-value" data-progress style="width:${progress}%"></div></div>
      ${state.prefs.paceTargetKpm ? `<div class="progress-track" aria-label="目標ペース"><div class="progress-value" data-pace style="width:${pace}%;opacity:.48"></div></div>` : ''}
      ${renderRomajiPrompt(activeRange)}
      ${state.mode === 'memorize' ? `<div class="stage-tools"><span class="helper-text">${state.started ? `進捗 ${activeIndex} / ${state.typing.tokenCharRanges.length} 文節` : 'ヒントを使わずに挑戦することもできます。'}</span>
        <div class="hint-tools">        <button class="button" type="button" data-action="hint" ${state.showAnswer ? 'disabled' : ''}>1文節ヒント（F1）</button>
        <button class="button" type="button" data-action="answer">${state.showAnswer ? '答えを隠す' : '答え合わせ'}</button></div></div>` : ''}
      ${renderTextStage(activeIndex)}
      <div class="stage-tools"><span class="helper-text">${state.started ? `進捗 ${activeIndex} / ${state.typing.tokenCharRanges.length} 文節` : 'キーボードを打つと自動で開始します'}</span>
        <button class="button" type="button" data-action="retry">やり直す（Esc）</button></div>
      ${state.prefs.showKeyboard && state.mode !== 'memorize' ? keyboardMarkup() : ''}
    </section>`}`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function makeChart(sessions) {
  if (!sessions.length) return '<div class="empty-state">このモードの記録はまだありません。</div>';
  const width = 760, height = 220, left = 44, right = 42, top = 14, bottom = 28;
  const innerW = width - left - right, innerH = height - top - bottom;
  const maxKpm = Math.ceil(Math.max(600, ...sessions.map((item) => item.kpm)) / 100) * 100;
  const points = sessions.map((session, index) => ({
    session,
    x: sessions.length === 1 ? left + innerW / 2 : left + index / (sessions.length - 1) * innerW,
    y: top + innerH - session.kpm / maxKpm * innerH,
    ay: top + innerH - (Math.max(50, Math.min(100, session.accuracy)) - 50) / 50 * innerH,
  }));
  const path = (key) => points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point[key].toFixed(1)}`).join(' ');
  const grid = [0, .25, .5, .75, 1].map((amount) => {
    const y = top + innerH * (1 - amount);
    return `<line x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" stroke="var(--line)"/>
      <text x="${left - 7}" y="${y + 4}" fill="var(--muted)" text-anchor="end" font-size="10">${Math.round(maxKpm * amount)}</text>`;
  }).join('');
  const y600 = top + innerH - 600 / maxKpm * innerH;
  return `<div class="chart-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="打鍵速度の推移">
    ${grid}<line x1="${left}" x2="${width - right}" y1="${y600}" y2="${y600}" stroke="var(--danger)" stroke-opacity=".5" stroke-dasharray="4 4"/>
    <path d="${path('y')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${path('ay')}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>
    ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.5" fill="var(--accent)"><title>${escapeHtml(point.session.targetTitle)} · ${point.session.kpm} KPM · 正確率 ${point.session.accuracy.toFixed(1)}%</title></circle>`).join('')}
    <text x="${left}" y="${height - 5}" fill="var(--muted)" font-size="10">過去</text><text x="${width - right}" y="${height - 5}" fill="var(--muted)" text-anchor="end" font-size="10">最新</text>
    </svg></div><div class="chart-legend"><span><i class="legend-line"></i>打鍵速度（KPM）</span><span><i class="legend-line accuracy"></i>正確率</span><span>赤点線: 600 KPM</span><span>直近${sessions.length}件</span></div>`;
}

function renderAnalytics() {
  const sessions = state.sessions;
  if (!sessions.length) {
    return `<div class="page-heading"><p class="eyebrow">練習の記録</p><h1>学習の進捗</h1>
      <p class="subheading">練習を1回完了すると、速度や正確率の推移を確認できます。</p></div>
      <section class="surface empty-state"><p>まだ完了した練習記録がありません。</p><button class="button primary" data-mode="split">分割練習をはじめる</button></section>`;
  }
  const recent = sessions.slice(-10);
  const totalCorrect = sessions.reduce((sum, item) => sum + item.correctKeys, 0);
  const maxKpm = Math.max(...sessions.map((item) => item.kpm));
  const avgKpm = Math.round(recent.reduce((sum, item) => sum + item.kpm, 0) / recent.length);
  const avgAccuracy = sessions.reduce((sum, item) => sum + item.accuracy, 0) / sessions.length;
  const clearCount = new Set(sessions.filter((item) => item.mode === 'memorize' && item.hintsUsed === 0).map((item) => item.targetId)).size;
  const chartSessions = (state.filter === 'all' ? sessions : sessions.filter((item) => item.mode === state.filter)).slice(-40);
  const targetList = [...PREAMBLE_SECTIONS.map((section) => ({ id: section.id, label: section.title })), { id: 'full', label: '全文通し（全8節）' }];
  const mastery = targetList.map((target) => {
    const items = sessions.filter((session) => session.targetId === target.id);
    return { ...target, attempts: items.length, best: Math.max(0, ...items.map((item) => item.kpm)), accuracy: Math.max(0, ...items.map((item) => item.accuracy)) };
  });
  const maxSection = Math.max(600, ...mastery.map((item) => item.best));
  const weak = Object.entries(state.keyStats).map(([key, stat]) => {
    const total = stat.hits + stat.misses;
    return { key, ...stat, total, rate: total ? stat.misses / total * 100 : 0 };
  }).filter((item) => item.total >= 3 && item.misses > 0).sort((a, b) => b.rate - a.rate || b.misses - a.misses).slice(0, 10);
  const rank = getSkillRank(maxKpm);
  return `<div class="page-heading"><p class="eyebrow">練習の記録</p><h1>学習の進捗と分析</h1>
    <p class="subheading">現在の最高到達位: ${escapeHtml(rank.label)} · 練習 ${sessions.length}回 · 累計正打 ${totalCorrect.toLocaleString()}キー</p></div>
    <div class="analytics-stack">
      <section class="surface analytics-card"><h2>これまでの進み具合</h2><div class="summary-grid">
        <div class="summary-tile"><span>最高速度</span><strong>${maxKpm} <small>KPM</small></strong></div>
        <div class="summary-tile"><span>直近10回平均</span><strong>${avgKpm} <small>KPM</small></strong></div>
        <div class="summary-tile"><span>平均正確率</span><strong>${avgAccuracy.toFixed(1)}<small>%</small></strong></div>
        <div class="summary-tile"><span>ノーヒント暗記</span><strong>${clearCount}<small> / 5枠</small></strong></div>
      </div></section>
      <section class="surface analytics-card"><div class="chart-header"><div><h2>打鍵速度と正確率の推移</h2><p class="subheading">練習の回数を重ねたときの変化を表示します。</p></div>
        <label class="setting"><span class="sr-only">表示する記録</span><select data-filter>
          <option value="all" ${state.filter === 'all' ? 'selected' : ''}>すべて</option>
          <option value="split" ${state.filter === 'split' ? 'selected' : ''}>分割練習</option>
          <option value="memorize" ${state.filter === 'memorize' ? 'selected' : ''}>全暗記</option>
        </select></label></div>${makeChart(chartSessions)}</section>
      <div class="analytics-card surface"><h2>節ごとの最高速度</h2><p class="subheading">節を選ぶと、そのまま練習を始められます。</p>
        <div class="section-progress">${mastery.map((item) => `<button type="button" data-jump="${item.id}">
          <span class="mastery-line"><span class="mastery-label">${escapeHtml(item.label)}</span><span>${item.attempts ? `${item.best} KPM · ${item.accuracy.toFixed(0)}% · ${item.attempts}回` : '未練習'}</span></span>
          <span class="bar-track"><span class="bar-fill" style="display:block;width:${Math.min(100, item.best / maxSection * 100)}%"></span></span></button>`).join('')}</div></div>
      <section class="surface analytics-card"><h2>苦手キー</h2><p class="subheading">誤打率の高いキーを表示しています。</p>
        ${weak.length ? `<div class="weak-list">${weak.map((item) => `<div class="weak-row"><strong class="weak-key">${escapeHtml(item.key.toUpperCase())}</strong><div class="weak-info"><span><b>誤打率 ${item.rate.toFixed(1)}%</b><span>誤 ${item.misses} / 全 ${item.total}</span></span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, item.rate * 2.5)}%"></div></div></div></div>`).join('')}</div>` : '<div class="empty-state">まだ十分な誤打データがありません。正確な打鍵ができています。</div>'}</section>
      <section class="surface analytics-card"><div class="chart-header"><div><h2>最近の練習履歴</h2><p class="subheading">新しい記録から10件</p></div>
        <button class="button danger" type="button" data-action="clear">${state.clearConfirm ? '本当に消去しますか？' : '記録を消去'}</button>
        ${state.clearConfirm ? '<button class="button" type="button" data-action="cancel-clear">キャンセル</button>' : ''}</div>
        <div class="history-wrap"><table><thead><tr><th>日時</th><th>種別</th><th>項目</th><th class="numeric">KPM</th><th class="numeric">正確率</th><th class="numeric">時間</th></tr></thead><tbody>
          ${sessions.slice(-10).reverse().map((session) => `<tr><td>${formatTime(session.timestamp)}</td><td>${escapeHtml(modeNames[session.mode] ?? modeNames.keywords)}</td><td>${escapeHtml(session.targetTitle)}</td><td class="numeric">${session.kpm}</td><td class="numeric">${session.accuracy.toFixed(1)}%</td><td class="numeric">${(session.durationMs / 1000).toFixed(1)}秒</td></tr>`).join('')}
        </tbody></table></div></section>
    </div>`;
}

function render() {
  applyTheme();
  const isAnalytics = state.mode === 'analytics';
  app.innerHTML = `<div class="shell">
    <header class="topbar"><div class="topbar-inner">
      <button class="brand" type="button" data-mode="split">憲法前文打鍵</button>
      <nav class="main-nav" aria-label="メインメニュー">
        <button class="nav-button" type="button" data-mode="split" aria-current="${state.mode === 'split' ? 'page' : 'false'}">分割練習</button>
        <button class="nav-button" type="button" data-mode="memorize" aria-current="${state.mode === 'memorize' ? 'page' : 'false'}">全暗記挑戦</button>
        <button class="nav-button" type="button" data-mode="analytics" aria-current="${isAnalytics ? 'page' : 'false'}">学習グラフ</button>
      </nav>
      <button class="theme-toggle" type="button" data-action="theme" aria-label="${state.prefs.theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}">${state.prefs.theme === 'light' ? '● 墨色' : '○ 生成'}</button>
    </div></header>
    <main>${isAnalytics ? renderAnalytics() : renderPractice()}</main>
    <footer><div class="footer-inner">
      <div class="footer-actions"><span>一括設定</span><button type="button" data-action="beginner">初心者向け（運指・ローマ字ガイド）</button><button type="button" data-action="expert">上級者向け（600 KPM基準）</button></div>
      <span>Esc やり直し · Enter 次へ · F1 暗記ヒント</span>
    </div></footer>
  </div>`;
}

function nextTarget() {
  if (state.mode === 'split') {
    const index = PREAMBLE_SECTIONS.findIndex((section) => section.id === state.sectionId);
    state.sectionId = index >= 0 && index < PREAMBLE_SECTIONS.length - 1
      ? PREAMBLE_SECTIONS[index + 1].id
      : index === PREAMBLE_SECTIONS.length - 1 ? 'full' : 'sec-1';
  } else {
    const order = ['p1', 'p2', 'p3', 'p4', 'all'];
    const index = order.indexOf(state.memorizeScope);
    state.memorizeScope = index >= 0 && index < order.length - 1 ? order[index + 1] : 'p1';
  }
  resetSession();
  render();
}

function finishSession() {
  const durationMs = Math.max(250, performance.now() - state.startedAt);
  const accuracy = state.correct + state.errors
    ? state.correct / (state.correct + state.errors) * 100 : 100;
  const target = currentTarget();
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    mode: state.mode,
    targetId: target.id,
    targetTitle: target.title,
    kpm: Math.round(state.correct / durationMs * 60000),
    wpm: Math.round(state.correct / durationMs * 60000 / 5),
    accuracy,
    durationMs,
    correctKeys: state.correct,
    errorKeys: state.errors,
    hintsUsed: state.hintsUsed ?? 0,
    textStyle: state.prefs.textStyle,
  };
  state.sessions = saveSession(record);
  state.keyStats = mergeKeyStats(state.keyDelta);
  state.completed = record;
  state.elapsedMs = durationMs;
  playCompleteChime(state.prefs.soundEnabled);
  render();
}

function revealHint() {
  if (state.mode !== 'memorize' || state.completed || state.showAnswer) return;
  const unit = state.typing.units[state.typing.unitIndex];
  if (!unit) return;
  state.revealedTokens.add(unit.tokenIndex);
  state.hintsUsed = (state.hintsUsed ?? 0) + 1;
  render();
}

function handleTypingKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.target?.tagName === 'SELECT') return;
  if (state.mode === 'analytics') return;
  if (event.key === 'Escape') {
    event.preventDefault();
    resetSession();
    render();
    return;
  }
  if (state.completed) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      nextTarget();
    }
    return;
  }
  if (state.mode === 'memorize' && event.key === 'F1') {
    event.preventDefault();
    revealHint();
    return;
  }
  if (event.isComposing || event.key === 'Process') {
    state.imeWarning = true;
    render();
    return;
  }
  if (event.key.length !== 1 || !/^[a-z0-9,.'\-/]$/i.test(event.key)) return;
  event.preventDefault();
  state.imeWarning = false;
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
  const key = event.key.toLowerCase();
  const result = processTypingKey(state.typing, key);
  if (result.outcome === 'ignored') return;
  if (!state.startedAt) state.startedAt = performance.now();
  state.lastKey = { key, outcome: result.outcome };
  const statKey = result.expectedKey || key;
  const stat = state.keyDelta[statKey] ?? { hits: 0, misses: 0 };
  if (result.outcome === 'hit') {
    playKeyClick(state.prefs.soundEnabled);
    state.correct += 1;
    state.recentMistake = false;
    state.keyDelta[statKey] = { hits: stat.hits + 1, misses: stat.misses };
    state.typing = result.nextState;
    if (state.typing.finished) {
      state.elapsedMs = performance.now() - state.startedAt;
      finishSession();
      return;
    }
  } else {
    playTypoSound(state.prefs.soundEnabled);
    state.errors += 1;
    state.recentMistake = true;
    state.keyDelta[statKey] = { hits: stat.hits, misses: stat.misses + 1 };
    state.missedKeys[statKey] = (state.missedKeys[statKey] ?? 0) + 1;
    if (state.prefs.strictMode) resetSession();
  }
  render();
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.mode) {
    switchMode(button.dataset.mode);
    return;
  }
  if (button.dataset.section) {
    state.sectionId = button.dataset.section;
    resetSession();
    render();
    return;
  }
  if (button.dataset.scope) {
    state.memorizeScope = button.dataset.scope;
    resetSession();
    render();
    return;
  }
  if (button.dataset.jump) {
    state.mode = 'split';
    state.sectionId = button.dataset.jump;
    resetSession();
    render();
    return;
  }
  switch (button.dataset.action) {
    case 'theme': applyPreferences({ theme: state.prefs.theme === 'light' ? 'dark' : 'light' }); break;
    case 'furigana': applyPreferences({ showFurigana: !state.prefs.showFurigana }); break;
    case 'keyboard': applyPreferences({ showKeyboard: !state.prefs.showKeyboard }); break;
    case 'strict': applyPreferences({ strictMode: !state.prefs.strictMode }); break;
    case 'sound': applyPreferences({ soundEnabled: !state.prefs.soundEnabled }); break;
    case 'retry': resetSession(); render(); break;
    case 'next': nextTarget(); break;
    case 'analytics': switchMode('analytics'); break;
    case 'hint': revealHint(); break;
    case 'answer': state.showAnswer = !state.showAnswer; render(); break;
    case 'hint-style': state.memorizeHintMode = state.memorizeHintMode === 'blank' ? 'initial' : 'blank'; render(); break;
    case 'beginner': applyPreferences({ showKeyboard: true, romajiGuide: 'always', showFurigana: true, paceTargetKpm: 200, strictMode: false }); break;
    case 'expert': applyPreferences({ showKeyboard: false, romajiGuide: 'mistake', showFurigana: false, paceTargetKpm: 600, strictMode: false }); break;
    case 'clear':
      if (state.clearConfirm) {
        clearAllProgress();
        state.sessions = [];
        state.keyStats = {};
        state.clearConfirm = false;
      } else state.clearConfirm = true;
      render();
      break;
    case 'cancel-clear': state.clearConfirm = false; render(); break;
  }
});

app.addEventListener('change', (event) => {
  const element = event.target;
  if (element.matches('[data-pref]')) {
    const pref = element.dataset.pref;
    const value = pref === 'paceTargetKpm' ? Number(element.value) : element.value;
    applyPreferences({ [pref]: value });
  } else if (element.matches('[data-filter]')) {
    state.filter = element.value;
    render();
  }
});

window.addEventListener('keydown', handleTypingKey);
window.setInterval(() => {
  if (!state.startedAt || state.completed) return;
  state.elapsedMs = performance.now() - state.startedAt;
  const elapsed = document.querySelector('[data-live-time]');
  const kpm = document.querySelector('[data-live-kpm]');
  const accuracy = document.querySelector('[data-live-accuracy]');
  const progress = document.querySelector('[data-progress]');
  const pace = document.querySelector('[data-pace]');
  if (elapsed) elapsed.textContent = `${(state.elapsedMs / 1000).toFixed(1)}s`;
  if (kpm) kpm.textContent = String(Math.round(state.correct / state.elapsedMs * 60000));
  if (accuracy) accuracy.textContent = `${Math.round(state.correct / Math.max(1, state.correct + state.errors) * 100)}%`;
  if (progress) progress.style.width = `${Math.round(state.typing.unitIndex / Math.max(1, state.typing.units.length) * 100)}%`;
  if (pace && state.prefs.paceTargetKpm) pace.style.width = `${Math.min(100, Math.round(state.elapsedMs / 60000 * state.prefs.paceTargetKpm / Math.max(1, state.typing.units.length * 1.8) * 100))}%`;
}, 100);

applyTheme();
render();
