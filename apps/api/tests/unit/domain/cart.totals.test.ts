import { describe, expect, it } from 'vitest';
import {
  computeSubtotal,
  computeOrderTotal,
  mergeCartItem,
  assertCartNotEmpty,
} from '../../../src/modules/ordering/domain/rules/cart.totals';
import { DomainError } from '../../../src/shared/domain/DomainError';

describe('cart totals', () => {
  it('merges items and computes totals', () => {
    const items = mergeCartItem([], 'a', 'A-10', 2);
    const merged = mergeCartItem(items, 'a', 'A-10', 1);
    expect(merged[0].quantity).toBe(3);
    // another size of the same product is its own line
    expect(mergeCartItem(merged, 'a', 'A-11', 1)).toHaveLength(2);

    const sub = computeSubtotal([{ productId: 'a', title: 'A', price: 1050, quantity: 2 }]);
    expect(sub).toBe(2100);
    expect(computeOrderTotal(2100, 500)).toBe(1600);
  });

  it('rejects empty cart', () => {
    expect(() => assertCartNotEmpty([])).toThrow(DomainError);
  });
});
