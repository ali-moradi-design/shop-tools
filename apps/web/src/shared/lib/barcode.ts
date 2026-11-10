/**
 * Code 39 barcode as SVG bars, for printed shipping labels. Code 39 needs no
 * checksum and every warehouse scanner reads it; it covers A–Z, 0–9 and - . space.
 */
const PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', A: 'wnnnnwnnw', B: 'nnwnnwnnw',
  C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn',
  I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww',
  O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

/** Bars as [x, width] pairs in narrow-bar units, and the total width. */
export function code39(text: string): { bars: [number, number][]; width: number } {
  const chars = `*${text.toUpperCase().replace(/[^0-9A-Z. -]/g, '')}*`;
  const bars: [number, number][] = [];
  let x = 0;
  for (const ch of chars) {
    const pattern = PATTERNS[ch];
    for (let i = 0; i < 9; i++) {
      const w = pattern[i] === 'w' ? 3 : 1;
      if (i % 2 === 0) bars.push([x, w]);
      x += w;
    }
    x += 1; // gap between characters
  }
  return { bars, width: x };
}
