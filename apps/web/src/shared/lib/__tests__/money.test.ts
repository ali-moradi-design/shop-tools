import { describe, expect, it } from 'vitest';
import { formatMoney } from '../money';

describe('formatMoney', () => {
  it('formats cents as dollars, hiding .00', () => {
    expect(formatMoney(19900)).toBe('$199');
    expect(formatMoney(17910)).toBe('$179.10');
    expect(formatMoney(5)).toBe('$0.05');
  });
});
