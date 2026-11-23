import { resolveToken } from "../data/preamble.js";
const KANA_ROMAJI_MAP = {
  // Vowels
  "\u3042": ["a"],
  "\u3044": ["i", "yi"],
  "\u3046": ["u", "wu", "whu"],
  "\u3048": ["e"],
  "\u304A": ["o"],
  // K-row
  "\u304B": ["ka", "ca"],
  "\u304D": ["ki"],
  "\u304F": ["ku", "cu", "qu"],
  "\u3051": ["ke"],
  "\u3053": ["ko", "co"],
  "\u304D\u3083": ["kya", "kilya", "kixya"],
  "\u304D\u3085": ["kyu", "kilyu", "kixyu"],
  "\u304D\u3087": ["kyo", "kilyo", "kixyo"],
  // S-row
  "\u3055": ["sa"],
  "\u3057": ["shi", "si", "ci"],
  "\u3059": ["su"],
  "\u305B": ["se", "ce"],
  "\u305D": ["so"],
  "\u3057\u3083": ["sha", "sya", "shilya", "shixya", "silya", "sixya"],
  "\u3057\u3085": ["shu", "syu", "shilyu", "shixyu", "silyu", "sixyu"],
  "\u3057\u3047": ["she", "sye", "shile", "shixe", "sile", "sixe"],
  "\u3057\u3087": ["sho", "syo", "shilyo", "shixyo", "silyo", "sixyo"],
  // T-row
  "\u305F": ["ta"],
  "\u3061": ["chi", "ti"],
  "\u3064": ["tsu", "tu"],
  "\u3066": ["te"],
  "\u3068": ["to"],
  "\u3061\u3083": ["cha", "tya", "cya", "chilya", "chixya", "tilya", "tixya"],
  "\u3061\u3085": ["chu", "tyu", "cyu", "chilyu", "chixyu", "tilyu", "tixyu"],
  "\u3061\u3047": ["che", "tye", "cye", "chile", "chixe", "tile", "tixe"],
  "\u3061\u3087": ["cho", "tyo", "cyo", "chilyo", "chixyo", "tilyo", "tixyo"],
  "\u3066\u3043": ["thi", "teli", "texi"],
  "\u3066\u3085": ["thu", "telyu", "texyu"],
  // N-row
  "\u306A": ["na"],
  "\u306B": ["ni"],
  "\u306C": ["nu"],
  "\u306D": ["ne"],
  "\u306E": ["no"],
  "\u306B\u3083": ["nya", "nilya", "nixya"],
  "\u306B\u3085": ["nyu", "nilyu", "nixyu"],
  "\u306B\u3087": ["nyo", "nilyo", "nixyo"],
  // H-row
  "\u306F": ["ha"],
  "\u3072": ["hi"],
  "\u3075": ["fu", "hu"],
  "\u3078": ["he"],
  "\u307B": ["ho"],
  "\u3072\u3083": ["hya", "hilya", "hixya"],
  "\u3072\u3085": ["hyu", "hilyu", "hixyu"],
  "\u3072\u3087": ["hyo", "hilyo", "hixyo"],
  "\u3075\u3041": ["fa", "fwa", "fula", "fuxa", "hula", "huxa"],
  "\u3075\u3043": ["fi", "fwi", "fyi", "fuli", "fuxi", "huli", "huxi"],
  "\u3075\u3047": ["fe", "fwe", "fye", "fule", "fuxe", "hule", "huxe"],
  "\u3075\u3049": ["fo", "fwo", "fulo", "fuxo", "hulo", "huxo"],
  // M-row
  "\u307E": ["ma"],
  "\u307F": ["mi"],
  "\u3080": ["mu"],
  "\u3081": ["me"],
  "\u3082": ["mo"],
  "\u307F\u3083": ["mya", "milya", "mixya"],
  "\u307F\u3085": ["myu", "milyu", "mixyu"],
  "\u307F\u3087": ["myo", "milyo", "mixyo"],
  // Y-row
  "\u3084": ["ya"],
  "\u3086": ["yu"],
  "\u3088": ["yo"],
  // R-row
  "\u3089": ["ra"],
  "\u308A": ["ri"],
  "\u308B": ["ru"],
  "\u308C": ["re"],
  "\u308D": ["ro"],
  "\u308A\u3083": ["rya", "rilya", "rixya"],
  "\u308A\u3085": ["ryu", "rilyu", "rixyu"],
  "\u308A\u3087": ["ryo", "rilyo", "rixyo"],
  // W-row
  "\u308F": ["wa"],
  "\u3090": ["wi", "i", "wyi"],
  "\u3091": ["we", "e", "wye"],
  "\u3092": ["wo"],
  // G-row
  "\u304C": ["ga"],
  "\u304E": ["gi"],
  "\u3050": ["gu"],
  "\u3052": ["ge"],
  "\u3054": ["go"],
  "\u304E\u3083": ["gya", "gilya", "gixya"],
  "\u304E\u3085": ["gyu", "gilyu", "gixyu"],
  "\u304E\u3087": ["gyo", "gilyo", "gixyo"],
  // Z-row
  "\u3056": ["za"],
  "\u3058": ["ji", "zi"],
  "\u305A": ["zu"],
  "\u305C": ["ze"],
  "\u305E": ["zo"],
  "\u3058\u3083": ["ja", "jya", "zya", "jilya", "jixya", "zilya", "zixya"],
  "\u3058\u3085": ["ju", "jyu", "zyu", "jilyu", "jixyu", "zilyu", "zixyu"],
  "\u3058\u3047": ["je", "jye", "zye", "jile", "jixe", "zile", "zixe"],
  "\u3058\u3087": ["jo", "jyo", "zyo", "jilyo", "jixyo", "zilyo", "zixyo"],
  // D-row
  "\u3060": ["da"],
  "\u3062": ["di", "dji"],
  "\u3065": ["du", "dzu"],
  "\u3067": ["de"],
  "\u3069": ["do"],
  "\u3062\u3083": ["dya", "dilya", "dixya"],
  "\u3062\u3085": ["dyu", "dilyu", "dixyu"],
  "\u3062\u3087": ["dyo", "dilyo", "dixyo"],
  "\u3067\u3043": ["dhi", "deli", "dexi"],
  "\u3067\u3085": ["dhu", "delyu", "dexyu"],
  // B-row
  "\u3070": ["ba"],
  "\u3073": ["bi"],
  "\u3076": ["bu"],
  "\u3079": ["be"],
  "\u307C": ["bo"],
  "\u3073\u3083": ["bya", "bilya", "bixya"],
  "\u3073\u3085": ["byu", "bilyu", "bixyu"],
  "\u3073\u3087": ["byo", "bilyo", "bixyo"],
  // P-row
  "\u3071": ["pa"],
  "\u3074": ["pi"],
  "\u3077": ["pu"],
  "\u307A": ["pe"],
  "\u307D": ["po"],
  "\u3074\u3083": ["pya", "pilya", "pixya"],
  "\u3074\u3085": ["pyu", "pilyu", "pixyu"],
  "\u3074\u3087": ["pyo", "pilyo", "pixyo"],
  // Small kana standalone
  "\u3041": ["xa", "la"],
  "\u3043": ["xi", "li"],
  "\u3045": ["xu", "lu"],
  "\u3047": ["xe", "le"],
  "\u3049": ["xo", "lo"],
  "\u3083": ["xya", "lya"],
  "\u3085": ["xyu", "lyu"],
  "\u3087": ["xyo", "lyo"],
  "\u3063": ["xtu", "xtsu", "ltu", "ltsu"],
  // Syllabic n
  "\u3093": ["nn", "n'", "xn"],
  // Punctuation & symbols
  "\u3001": [","],
  "\u3002": ["."],
  "\u30FC": ["-"],
  "\u30FB": ["/"]
};
const GEMINABLE_CONSONANT = /^[bcdfghjkmpqrstvwz]$/;
const VOWEL_OR_N_OR_Y = /^[aiueony]/;
function tokenizeReadingToUnits(tokens, style) {
  const units = [];
  const tokenRanges = [];
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
            tokenIndex
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
        tokenIndex
      });
      i += 1;
    }
    tokenRanges.push({
      start,
      end: units.length,
      display: resolved.display,
      reading: resolved.reading
    });
  });
  return { units, tokenRanges };
}
function createTypingState(tokens, style) {
  const { units, tokenRanges } = tokenizeReadingToUnits(tokens, style);
  return {
    units,
    tokenCharRanges: tokenRanges,
    unitIndex: 0,
    buffer: "",
    typedHistory: "",
    finished: units.length === 0
  };
}
function canSingleN(units, index) {
  if (index + 1 >= units.length) return false;
  const next = units[index + 1];
  const firstPat = next.patterns[0];
  if (!firstPat) return false;
  return !VOWEL_OR_N_OR_Y.test(firstPat);
}
function getGeminationConsonants(units, index) {
  const set = /* @__PURE__ */ new Set();
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
function getPreferredPatternForUnit(units, index, buffer) {
  const unit = units[index];
  if (!unit) return "";
  if (unit.kana === "\u3063") {
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
  if (unit.kana === "\u3093") {
    if (buffer === "n" && canSingleN(units, index)) {
      return "nn";
    }
    if (buffer.length > 0) {
      const match = unit.patterns.find((p) => p.startsWith(buffer));
      if (match) return match;
    }
    if (canSingleN(units, index)) {
      return "n";
    }
    return "nn";
  }
  if (buffer.length > 0) {
    const match = unit.patterns.find((p) => p.startsWith(buffer));
    if (match) return match;
  }
  return unit.patterns[0];
}
function getExpectedNextKey(state) {
  if (state.finished || state.unitIndex >= state.units.length) return "";
  const unit = state.units[state.unitIndex];
  if (unit.kana === "\u3093" && state.buffer === "n") {
    if (canSingleN(state.units, state.unitIndex) && state.unitIndex + 1 < state.units.length) {
      return state.units[state.unitIndex + 1].patterns[0]?.[0] ?? "n";
    }
    return "n";
  }
  if (unit.kana === "\u3063" && state.buffer.length === 1) {
    const gemConsonants = getGeminationConsonants(state.units, state.unitIndex);
    if (gemConsonants.has(state.buffer)) {
      return state.buffer;
    }
  }
  const pat = getPreferredPatternForUnit(state.units, state.unitIndex, state.buffer);
  return pat[state.buffer.length] ?? "";
}
function getRemainingRomajiForRange(state, fromUnit, toUnitExclusive) {
  let out = "";
  for (let i = fromUnit; i < toUnitExclusive && i < state.units.length; i++) {
    if (i < state.unitIndex) continue;
    const buf = i === state.unitIndex ? state.buffer : "";
    const unit = state.units[i];
    if (unit.kana === "\u3093" && buf === "n" && canSingleN(state.units, i)) {
      continue;
    }
    if (unit.kana === "\u3063" && buf.length === 1 && getGeminationConsonants(state.units, i).has(buf)) {
      continue;
    }
    const pat = getPreferredPatternForUnit(state.units, i, buf);
    out += pat.slice(buf.length);
  }
  return out;
}
function processTypingKey(state, rawKey) {
  if (state.finished || state.unitIndex >= state.units.length) {
    return { nextState: state, outcome: "ignored", expectedKey: "" };
  }
  const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
  if (!/^[a-z0-9,.'\-/]$/.test(key)) {
    return { nextState: state, outcome: "ignored", expectedKey: getExpectedNextKey(state) };
  }
  const unit = state.units[state.unitIndex];
  const expectedKey = getExpectedNextKey(state);
  if (unit.kana === "\u3093" && state.buffer === "n") {
    if (key === "n" || key === "'") {
      const nextIndex = state.unitIndex + 1;
      return {
        nextState: {
          ...state,
          unitIndex: nextIndex,
          buffer: "",
          typedHistory: state.typedHistory + key,
          finished: nextIndex >= state.units.length
        },
        outcome: "hit",
        expectedKey
      };
    }
    if (canSingleN(state.units, state.unitIndex) && state.unitIndex + 1 < state.units.length) {
      const nextUnit = state.units[state.unitIndex + 1];
      const nextMatches = nextUnit.patterns.filter((p) => p.startsWith(key));
      if (nextMatches.length > 0) {
        const completedNext = nextMatches.includes(key);
        const targetUnitIndex = completedNext ? state.unitIndex + 2 : state.unitIndex + 1;
        return {
          nextState: {
            ...state,
            unitIndex: targetUnitIndex,
            buffer: completedNext ? "" : key,
            typedHistory: state.typedHistory + key,
            finished: targetUnitIndex >= state.units.length
          },
          outcome: "hit",
          expectedKey
        };
      }
    }
    return { nextState: state, outcome: "typo", expectedKey };
  }
  if (unit.kana === "\u3063") {
    const gemConsonants = getGeminationConsonants(state.units, state.unitIndex);
    if (state.buffer === "") {
      if (gemConsonants.has(key) && state.unitIndex + 1 < state.units.length) {
        return {
          nextState: {
            ...state,
            buffer: key,
            typedHistory: state.typedHistory + key
          },
          outcome: "hit",
          expectedKey
        };
      }
    } else if (state.buffer.length === 1 && gemConsonants.has(state.buffer)) {
      if (key === state.buffer && state.unitIndex + 1 < state.units.length) {
        return {
          nextState: {
            ...state,
            unitIndex: state.unitIndex + 1,
            buffer: key,
            typedHistory: state.typedHistory + key,
            finished: false
          },
          outcome: "hit",
          expectedKey
        };
      }
      return { nextState: state, outcome: "typo", expectedKey };
    }
  }
  const nextBuffer = state.buffer + key;
  const matchingPatterns = unit.patterns.filter((p) => p.startsWith(nextBuffer));
  if (matchingPatterns.length === 0) {
    return { nextState: state, outcome: "typo", expectedKey };
  }
  if (unit.kana === "\u3093" && nextBuffer === "n") {
    return {
      nextState: {
        ...state,
        buffer: "n",
        typedHistory: state.typedHistory + key
      },
      outcome: "hit",
      expectedKey
    };
  }
  if (matchingPatterns.includes(nextBuffer)) {
    const nextIndex = state.unitIndex + 1;
    return {
      nextState: {
        ...state,
        unitIndex: nextIndex,
        buffer: "",
        typedHistory: state.typedHistory + key,
        finished: nextIndex >= state.units.length
      },
      outcome: "hit",
      expectedKey
    };
  }
  return {
    nextState: {
      ...state,
      buffer: nextBuffer,
      typedHistory: state.typedHistory + key
    },
    outcome: "hit",
    expectedKey
  };
}
export {
  KANA_ROMAJI_MAP,
  createTypingState,
  getExpectedNextKey,
  getPreferredPatternForUnit,
  getRemainingRomajiForRange,
  processTypingKey,
  tokenizeReadingToUnits
};
