import { describe, expect, it } from 'vitest';
import { code39 } from '../barcode';

describe('code39', () => {
  it('wraps the text in start/stop characters: 5 bars per character', () => {
    const { bars } = code39('TB-1');
    // *, T, B, -, 1, * = 6 characters × 5 bars
    expect(bars).toHaveLength(30);
  });

  it('drops characters Code 39 cannot encode and is case-insensitive', () => {
    expect(code39('tb-1#').width).toBe(code39('TB-1').width);
  });

  it('uses narrow (1) and wide (3) bars only', () => {
    expect(new Set(code39('ORDER 42').bars.map(([, w]) => w))).toEqual(new Set([1, 3]));
  });
});
