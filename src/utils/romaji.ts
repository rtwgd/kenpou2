import { PreambleToken, resolveToken } from '../data/preamble';

export const KANA_ROMAJI_MAP: Record<string, string[]> = {
  // Vowels
  'あ': ['a'],
  'い': ['i', 'yi'],
  'う': ['u', 'wu', 'whu'],
  'え': ['e'],
  'お': ['o'],

  // K-row
  'か': ['ka', 'ca'],
  'き': ['ki'],
  'く': ['ku', 'cu', 'qu'],
  'け': ['ke'],
  'こ': ['ko', 'co'],
  'きゃ': ['kya', 'kilya', 'kixya'],
  'きゅ': ['kyu', 'kilyu', 'kixyu'],
  'きょ': ['kyo', 'kilyo', 'kixyo'],

  // S-row
  'さ': ['sa'],
  'し': ['shi', 'si', 'ci'],
  'す': ['su'],
  'せ': ['se', 'ce'],
  'そ': ['so'],
  'しゃ': ['sha', 'sya', 'shilya', 'shixya', 'silya', 'sixya'],
  'しゅ': ['shu', 'syu', 'shilyu', 'shixyu', 'silyu', 'sixyu'],
  'しぇ': ['she', 'sye', 'shile', 'shixe', 'sile', 'sixe'],
  'しょ': ['sho', 'syo', 'shilyo', 'shixyo', 'silyo', 'sixyo'],

  // T-row
  'た': ['ta'],
  'ち': ['chi', 'ti'],
  'つ': ['tsu', 'tu'],
  'て': ['te'],
  'と': ['to'],
  'ちゃ': ['cha', 'tya', 'cya', 'chilya', 'chixya', 'tilya', 'tixya'],
  'ちゅ': ['chu', 'tyu', 'cyu', 'chilyu', 'chixyu', 'tilyu', 'tixyu'],
  'ちぇ': ['che', 'tye', 'cye', 'chile', 'chixe', 'tile', 'tixe'],
  'ちょ': ['cho', 'tyo', 'cyo', 'chilyo', 'chixyo', 'tilyo', 'tixyo'],
  'てぃ': ['thi', 'teli', 'texi'],
  'てゅ': ['thu', 'telyu', 'texyu'],

  // N-row
  'な': ['na'],
  'に': ['ni'],
  'ぬ': ['nu'],
  'ね': ['ne'],
  'の': ['no'],
  'にゃ': ['nya', 'nilya', 'nixya'],
  'にゅ': ['nyu', 'nilyu', 'nixyu'],
  'にょ': ['nyo', 'nilyo', 'nixyo'],

  // H-row
  'は': ['ha'],
  'ひ': ['hi'],
  'ふ': ['fu', 'hu'],
  'へ': ['he'],
  'ほ': ['ho'],
  'ひゃ': ['hya', 'hilya', 'hixya'],
  'ひゅ': ['hyu', 'hilyu', 'hixyu'],
  'ひょ': ['hyo', 'hilyo', 'hixyo'],
  'ふぁ': ['fa', 'fwa', 'fula', 'fuxa', 'hula', 'huxa'],
  'ふぃ': ['fi', 'fwi', 'fyi', 'fuli', 'fuxi', 'huli', 'huxi'],
  'ふぇ': ['fe', 'fwe', 'fye', 'fule', 'fuxe', 'hule', 'huxe'],
  'ふぉ': ['fo', 'fwo', 'fulo', 'fuxo', 'hulo', 'huxo'],

  // M-row
  'ま': ['ma'],
  'み': ['mi'],
  'む': ['mu'],
  'め': ['me'],
  'も': ['mo'],
  'みゃ': ['mya', 'milya', 'mixya'],
  'みゅ': ['myu', 'milyu', 'mixyu'],
  'みょ': ['myo', 'milyo', 'mixyo'],

  // Y-row
  'や': ['ya'],
  'ゆ': ['yu'],
  'よ': ['yo'],

  // R-row
  'ら': ['ra'],
  'り': ['ri'],
  'る': ['ru'],
  'れ': ['re'],
  'ろ': ['ro'],
  'りゃ': ['rya', 'rilya', 'rixya'],
  'りゅ': ['ryu', 'rilyu', 'rixyu'],
  'りょ': ['ryo', 'rilyo', 'rixyo'],

  // W-row
  'わ': ['wa'],
  'ゐ': ['wi', 'i', 'wyi'],
  'ゑ': ['we', 'e', 'wye'],
  'を': ['wo'],

  // G-row
  'が': ['ga'],
  'ぎ': ['gi'],
  'ぐ': ['gu'],
  'げ': ['ge'],
  'ご': ['go'],
  'ぎゃ': ['gya', 'gilya', 'gixya'],
  'ぎゅ': ['gyu', 'gilyu', 'gixyu'],
  'ぎょ': ['gyo', 'gilyo', 'gixyo'],

  // Z-row
  'ざ': ['za'],
  'じ': ['ji', 'zi'],
  'ず': ['zu'],
  'ぜ': ['ze'],
  'ぞ': ['zo'],
  'じゃ': ['ja', 'jya', 'zya', 'jilya', 'jixya', 'zilya', 'zixya'],
  'じゅ': ['ju', 'jyu', 'zyu', 'jilyu', 'jixyu', 'zilyu', 'zixyu'],
  'じぇ': ['je', 'jye', 'zye', 'jile', 'jixe', 'zile', 'zixe'],
  'じょ': ['jo', 'jyo', 'zyo', 'jilyo', 'jixyo', 'zilyo', 'zixyo'],

  // D-row
  'だ': ['da'],
  'ぢ': ['di', 'dji'],
  'づ': ['du', 'dzu'],
  'で': ['de'],
  'ど': ['do'],
  'ぢゃ': ['dya', 'dilya', 'dixya'],
  'ぢゅ': ['dyu', 'dilyu', 'dixyu'],
  'ぢょ': ['dyo', 'dilyo', 'dixyo'],
  'でぃ': ['dhi', 'deli', 'dexi'],
  'でゅ': ['dhu', 'delyu', 'dexyu'],

  // B-row
  'ば': ['ba'],
  'び': ['bi'],
  'ぶ': ['bu'],
  'べ': ['be'],
  'ぼ': ['bo'],
  'びゃ': ['bya', 'bilya', 'bixya'],
  'びゅ': ['byu', 'bilyu', 'bixyu'],
  'びょ': ['byo', 'bilyo', 'bixyo'],

  // P-row
  'ぱ': ['pa'],
  'ぴ': ['pi'],
  'ぷ': ['pu'],
  'ぺ': ['pe'],
  'ぽ': ['po'],
  'ぴゃ': ['pya', 'pilya', 'pixya'],
  'ぴゅ': ['pyu', 'pilyu', 'pixyu'],
  'ぴょ': ['pyo', 'pilyo', 'pixyo'],

  // Small kana standalone
  'ぁ': ['xa', 'la'],
  'ぃ': ['xi', 'li'],
  'ぅ': ['xu', 'lu'],
  'ぇ': ['xe', 'le'],
  'ぉ': ['xo', 'lo'],
  'ゃ': ['xya', 'lya'],
  'ゅ': ['xyu', 'lyu'],
  'ょ': ['xyo', 'lyo'],
  'っ': ['xtu', 'xtsu', 'ltu', 'ltsu'],

  // Syllabic n
  'ん': ['nn', "n'", 'xn'],

  // Punctuation & symbols
  '、': [','],
  '。': ['.'],
  'ー': ['-'],
  '・': ['/'],
};

export interface KanaUnit {
  kana: string;
  patterns: string[];
  tokenIndex: number;
}

export interface TypingState {
  units: KanaUnit[];
  tokenCharRanges: { start: number; end: number; display: string; reading: string }[];
  unitIndex: number;
  buffer: string;
  typedHistory: string;
  finished: boolean;
}

const GEMINABLE_CONSONANT = /^[bcdfghjkmpqrstvwz]$/;
const VOWEL_OR_N_OR_Y = /^[aiueony]/;

export function tokenizeReadingToUnits(
  tokens: PreambleToken[],
  style: 'original' | 'modern'
): { units: KanaUnit[]; tokenRanges: { start: number; end: number; display: string; reading: string }[] } {
  const units: KanaUnit[] = [];
  const tokenRanges: { start: number; end: number; display: string; reading: string }[] = [];

  tokens.forEach((rawToken, tokenIndex) => {
    const resolved = resolveToken(rawToken, style);
    const r = resolved.reading;
    const start = units.length;

    let i = 0;
    while (i < r.length) {
      if (i + 1 < r.length) {
        const pair = r.slice(i, i + 2);
        if (KANA_ROMAJI_MAP[pair]) {
          units.push({
            kana: pair,
            patterns: KANA_ROMAJI_MAP[pair],
            tokenIndex,
          });
          i += 2;
          continue;
        }
      }
      const ch = r[i];
      const patterns = KANA_ROMAJI_MAP[ch] ?? [ch];
      units.push({
        kana: ch,
        patterns,
        tokenIndex,
      });
      i += 1;
    }

    tokenRanges.push({
      start,
      end: units.length,
      display: resolved.display,
      reading: resolved.reading,
    });
  });

  return { units, tokenRanges };
}

export function createTypingState(tokens: PreambleToken[], style: 'original' | 'modern'): TypingState {
  const { units, tokenRanges } = tokenizeReadingToUnits(tokens, style);
  return {
    units,
    tokenCharRanges: tokenRanges,
    unitIndex: 0,
    buffer: '',
    typedHistory: '',
    finished: units.length === 0,
  };
}

function canSingleN(units: KanaUnit[], index: number): boolean {
  if (index + 1 >= units.length) return false;
  const next = units[index + 1];
  // Single 'n' is valid before any kana whose primary romaji does NOT begin with a, i, u, e, o, n, y
  const firstPat = next.patterns[0];
  if (!firstPat) return false;
  return !VOWEL_OR_N_OR_Y.test(firstPat);
}

function getGeminationConsonants(units: KanaUnit[], index: number): Set<string> {
  const set = new Set<string>();
  if (index + 1 >= units.length) return set;
  const next = units[index + 1];
  for (const p of next.patterns) {
    const ch = p[0];
    if (ch && GEMINABLE_CONSONANT.test(ch)) {
      set.add(ch);
    }
  }
  return set;
}

export function getPreferredPatternForUnit(units: KanaUnit[], index: number, buffer: string): string {
  const unit = units[index];
  if (!unit) return '';

  if (unit.kana === 'っ') {
    if (buffer.length > 0) {
      const match = unit.patterns.find((p) => p.startsWith(buffer));
      if (match) return match;
    }
    const gem = getGeminationConsonants(units, index);
    if (gem.size > 0 && index + 1 < units.length) {
      const nextPrimary = units[index + 1].patterns[0];
      if (nextPrimary && gem.has(nextPrimary[0])) {
        return nextPrimary[0];
      }
    }
    return unit.patterns[0];
  }

  if (unit.kana === 'ん') {
    if (buffer === 'n' && canSingleN(units, index)) {
      return 'nn'; // if still buffered at 'n', waiting for 'n', "'", or next consonant
    }
    if (buffer.length > 0) {
      const match = unit.patterns.find((p) => p.startsWith(buffer));
      if (match) return match;
    }
    if (canSingleN(units, index)) {
      return 'n';
    }
    return 'nn';
  }

  if (buffer.length > 0) {
    const match = unit.patterns.find((p) => p.startsWith(buffer));
    if (match) return match;
  }

  return unit.patterns[0];
}

export function getExpectedNextKey(state: TypingState): string {
  if (state.finished || state.unitIndex >= state.units.length) return '';
  const unit = state.units[state.unitIndex];

  if (unit.kana === 'ん' && state.buffer === 'n') {
    if (canSingleN(state.units, state.unitIndex) && state.unitIndex + 1 < state.units.length) {
      return state.units[state.unitIndex + 1].patterns[0]?.[0] ?? 'n';
    }
    return 'n';
  }

  if (unit.kana === 'っ' && state.buffer.length === 1) {
    const gemConsonants = getGeminationConsonants(state.units, state.unitIndex);
    if (gemConsonants.has(state.buffer)) {
      return state.buffer;
    }
  }

  const pat = getPreferredPatternForUnit(state.units, state.unitIndex, state.buffer);
  return pat[state.buffer.length] ?? '';
}

export function getRemainingRomajiForRange(
  state: TypingState,
  fromUnit: number,
  toUnitExclusive: number
): string {
  let out = '';
  for (let i = fromUnit; i < toUnitExclusive && i < state.units.length; i++) {
    if (i < state.unitIndex) continue;
    const buf = i === state.unitIndex ? state.buffer : '';
    const unit = state.units[i];
    if (unit.kana === 'ん' && buf === 'n' && canSingleN(state.units, i)) {
      // Single n already typed; next key belongs to next unit
      continue;
    }
    if (unit.kana === 'っ' && buf.length === 1 && getGeminationConsonants(state.units, i).has(buf)) {
      // First consonant of gemination already typed; remaining starts at next unit's consonant
      continue;
    }
    const pat = getPreferredPatternForUnit(state.units, i, buf);
    out += pat.slice(buf.length);
  }
  return out;
}

export interface KeyProcessResult {
  nextState: TypingState;
  outcome: 'hit' | 'typo' | 'ignored';
  expectedKey: string;
}

export function processTypingKey(state: TypingState, rawKey: string): KeyProcessResult {
  if (state.finished || state.unitIndex >= state.units.length) {
    return { nextState: state, outcome: 'ignored', expectedKey: '' };
  }

  const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
  if (!/^[a-z0-9,.'\-/]$/.test(key)) {
    return { nextState: state, outcome: 'ignored', expectedKey: getExpectedNextKey(state) };
  }

  const unit = state.units[state.unitIndex];
  const expectedKey = getExpectedNextKey(state);

  // Special case 1: Currently in 'ん' with buffer === 'n'
  if (unit.kana === 'ん' && state.buffer === 'n') {
    if (key === 'n' || key === "'") {
      const nextIndex = state.unitIndex + 1;
      return {
        nextState: {
          ...state,
          unitIndex: nextIndex,
          buffer: '',
          typedHistory: state.typedHistory + key,
          finished: nextIndex >= state.units.length,
        },
        outcome: 'hit',
        expectedKey,
      };
    }

    if (canSingleN(state.units, state.unitIndex) && state.unitIndex + 1 < state.units.length) {
      const nextUnit = state.units[state.unitIndex + 1];
      const nextMatches = nextUnit.patterns.filter((p) => p.startsWith(key));
      if (nextMatches.length > 0) {
        // Consume 'ん' with single 'n' and advance into next unit!
        const completedNext = nextMatches.includes(key);
        const targetUnitIndex = completedNext ? state.unitIndex + 2 : state.unitIndex + 1;
        return {
          nextState: {
            ...state,
            unitIndex: targetUnitIndex,
            buffer: completedNext ? '' : key,
            typedHistory: state.typedHistory + key,
            finished: targetUnitIndex >= state.units.length,
          },
          outcome: 'hit',
          expectedKey,
        };
      }
    }

    return { nextState: state, outcome: 'typo', expectedKey };
  }

  // Special case 2: Currently at 'っ'
  if (unit.kana === 'っ') {
    const gemConsonants = getGeminationConsonants(state.units, state.unitIndex);
    if (state.buffer === '') {
      if (gemConsonants.has(key) && state.unitIndex + 1 < state.units.length) {
        // Record first consonant in 'っ' buffer and stay on 'っ'
        return {
          nextState: {
            ...state,
            buffer: key,
            typedHistory: state.typedHistory + key,
          },
          outcome: 'hit',
          expectedKey,
        };
      }
    } else if (state.buffer.length === 1 && gemConsonants.has(state.buffer)) {
      if (key === state.buffer && state.unitIndex + 1 < state.units.length) {
        // Second identical consonant completes 'っ' and pre-fills next unit's buffer
        return {
          nextState: {
            ...state,
            unitIndex: state.unitIndex + 1,
            buffer: key,
            typedHistory: state.typedHistory + key,
            finished: false,
          },
          outcome: 'hit',
          expectedKey,
        };
      }
      return { nextState: state, outcome: 'typo', expectedKey };
    }
  }

  // Standard pattern matching on current unit
  const nextBuffer = state.buffer + key;
  const matchingPatterns = unit.patterns.filter((p) => p.startsWith(nextBuffer));

  if (matchingPatterns.length === 0) {
    return { nextState: state, outcome: 'typo', expectedKey };
  }

  // Special handling for 'ん' when user just typed first 'n'
  if (unit.kana === 'ん' && nextBuffer === 'n') {
    return {
      nextState: {
        ...state,
        buffer: 'n',
        typedHistory: state.typedHistory + key,
      },
      outcome: 'hit',
      expectedKey,
    };
  }

  // Check if nextBuffer exactly completes one of the unit's patterns
  // Note: e.g. for 'n' we handled above; for other units, patterns are prefix-free or exact match completes!
  // Wait: 'xtu' vs 'xtsu' — 'xtu' and 'xtsu' diverge at index 2 ('u' vs 's'), so exact match is unambiguous!
  if (matchingPatterns.includes(nextBuffer)) {
    const nextIndex = state.unitIndex + 1;
    return {
      nextState: {
        ...state,
        unitIndex: nextIndex,
        buffer: '',
        typedHistory: state.typedHistory + key,
        finished: nextIndex >= state.units.length,
      },
      outcome: 'hit',
      expectedKey,
    };
  }

  return {
    nextState: {
      ...state,
      buffer: nextBuffer,
      typedHistory: state.typedHistory + key,
    },
    outcome: 'hit',
    expectedKey,
  };
}
