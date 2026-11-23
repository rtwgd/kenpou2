import React from 'react';

interface KeyboardGuideProps {
  expectedKey: string;
  lastKeyPress: { key: string; outcome: 'hit' | 'typo'; seq: number } | null;
}

type FingerId =
  | 'L_PINKY'
  | 'L_RING'
  | 'L_MIDDLE'
  | 'L_INDEX'
  | 'R_INDEX'
  | 'R_MIDDLE'
  | 'R_RING'
  | 'R_PINKY';

const FINGER_LABELS: Record<FingerId, string> = {
  L_PINKY: '左手・小指',
  L_RING: '左手・薬指',
  L_MIDDLE: '左手・中指',
  L_INDEX: '左手・人差し指',
  R_INDEX: '右手・人差し指',
  R_MIDDLE: '右手・中指',
  R_RING: '右手・薬指',
  R_PINKY: '右手・小指',
};

const KEY_FINGER: Record<string, FingerId> = {
  '1': 'L_PINKY',
  q: 'L_PINKY',
  a: 'L_PINKY',
  z: 'L_PINKY',
  '2': 'L_RING',
  w: 'L_RING',
  s: 'L_RING',
  x: 'L_RING',
  '3': 'L_MIDDLE',
  e: 'L_MIDDLE',
  d: 'L_MIDDLE',
  c: 'L_MIDDLE',
  '4': 'L_INDEX',
  '5': 'L_INDEX',
  r: 'L_INDEX',
  t: 'L_INDEX',
  f: 'L_INDEX',
  g: 'L_INDEX',
  v: 'L_INDEX',
  b: 'L_INDEX',
  '6': 'R_INDEX',
  '7': 'R_INDEX',
  y: 'R_INDEX',
  u: 'R_INDEX',
  h: 'R_INDEX',
  j: 'R_INDEX',
  n: 'R_INDEX',
  m: 'R_INDEX',
  '8': 'R_MIDDLE',
  i: 'R_MIDDLE',
  k: 'R_MIDDLE',
  ',': 'R_MIDDLE',
  '9': 'R_RING',
  o: 'R_RING',
  l: 'R_RING',
  '.': 'R_RING',
  '0': 'R_PINKY',
  '-': 'R_PINKY',
  p: 'R_PINKY',
  ';': 'R_PINKY',
  "'": 'R_PINKY',
  '/': 'R_PINKY',
};

const ROWS: { key: string; label: string; home?: boolean }[][] = [
  [
    { key: 'q', label: 'Q' },
    { key: 'w', label: 'W' },
    { key: 'e', label: 'E' },
    { key: 'r', label: 'R' },
    { key: 't', label: 'T' },
    { key: 'y', label: 'Y' },
    { key: 'u', label: 'U' },
    { key: 'i', label: 'I' },
    { key: 'o', label: 'O' },
    { key: 'p', label: 'P' },
    { key: '-', label: '-' },
  ],
  [
    { key: 'a', label: 'A' },
    { key: 's', label: 'S' },
    { key: 'd', label: 'D' },
    { key: 'f', label: 'F', home: true },
    { key: 'g', label: 'G' },
    { key: 'h', label: 'H' },
    { key: 'j', label: 'J', home: true },
    { key: 'k', label: 'K' },
    { key: 'l', label: 'L' },
    { key: "'", label: "'" },
  ],
  [
    { key: 'z', label: 'Z' },
    { key: 'x', label: 'X' },
    { key: 'c', label: 'C' },
    { key: 'v', label: 'V' },
    { key: 'b', label: 'B' },
    { key: 'n', label: 'N' },
    { key: 'm', label: 'M' },
    { key: ',', label: '、 ,' },
    { key: '.', label: '。 .' },
    { key: '/', label: '/' },
  ],
];

const ROW_OFFSETS = ['pl-0', 'pl-5 sm:pl-6', 'pl-10 sm:pl-12'];

export const KeyboardGuide: React.FC<KeyboardGuideProps> = ({ expectedKey, lastKeyPress }) => {
  const normalizedExpected = expectedKey.toLowerCase();
  const finger = KEY_FINGER[normalizedExpected];
  const fingerLabel = finger ? FINGER_LABELS[finger] : null;

  return (
    <div className="w-full max-w-2xl mx-auto pt-4 border-t border-[#E5E2DC] dark:border-neutral-800 select-none">
      <div className="flex items-center justify-between text-xs text-[#6B6760] dark:text-neutral-400 mb-3">
        <span>運指ガイド（F・J がホームポジション）</span>
        <span className="font-mono-tabular font-medium text-[#1A1917] dark:text-neutral-200">
          {normalizedExpected ? (
            <>
              次のキー: <span className="uppercase">{normalizedExpected}</span>
              {fingerLabel ? `（${fingerLabel}）` : ''}
            </>
          ) : (
            '待機中'
          )}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 items-center">
        {ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className={`flex items-center gap-1.5 ${ROW_OFFSETS[rowIdx]}`}>
            {row.map((item) => {
              const isExpected = item.key === normalizedExpected;
              const isLastPressed = lastKeyPress?.key === item.key;
              const isTypo = isLastPressed && lastKeyPress?.outcome === 'typo';

              let stateClass =
                'bg-white dark:bg-neutral-900 text-[#4A4742] dark:text-neutral-300 border-[#DFDCD5] dark:border-neutral-800';
              if (isTypo) {
                stateClass =
                  'bg-[#B93829] text-white border-[#B93829] dark:bg-[#B93829] dark:border-[#B93829]';
              } else if (isExpected) {
                stateClass =
                  'bg-[#1D3557] text-white border-[#1D3557] dark:bg-[#E6E2D8] dark:text-[#141413] dark:border-[#E6E2D8] shadow-sm';
              }

              return (
                <div
                  key={item.key}
                  className={`relative w-8 h-9 sm:w-10 sm:h-10 rounded border flex items-center justify-center text-xs sm:text-sm font-mono-tabular font-medium transition-colors duration-100 ${stateClass}`}
                >
                  <span>{item.label}</span>
                  {item.home && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1 w-2.5 h-[1.5px] rounded-full ${
                        isExpected
                          ? 'bg-white/80 dark:bg-[#141413]/70'
                          : 'bg-[#A6A198] dark:text-neutral-600'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
