import { describe, expect, it } from 'vitest';
import { formatRangeParam, parsePrice, parseRangeParam, readFilters, toProductQuery } from '../params';

describe('readFilters', () => {
  it('keeps known keys and spec filters, drops the rest, cuts long values', () => {
    const f = readFilters({
      q: 'drill',
      sort: ['price-asc', 'x'],
      'spec.torque': '40..100Nm',
      evil: '1',
      'spec.BAD KEY': '1',
      page: 'x'.repeat(300),
    });
    expect(f.q).toBe('drill');
    expect(f.sort).toBe('price-asc');
    expect(f['spec.torque']).toBe('40..100Nm');
    expect(f.evil).toBeUndefined();
    expect(f['spec.BAD KEY']).toBeUndefined();
    expect(f.page).toHaveLength(100);
  });
});

describe('toProductQuery', () => {
  it('turns URL params into an API query', () => {
    const q = toProductQuery(
      { sort: 'price-desc', instock: '1', warehouse: 'BER', price: '50..200', 'spec.torque': '40..100Nm', page: '3' },
      'drills',
    );
    expect(q).toMatchObject({
      category: 'drills',
      sort: 'price',
      order: 'desc',
      inStock: true,
      warehouse: 'BER',
      minPrice: 5000,
      maxPrice: 20000,
      page: 3,
      specs: { 'spec.torque': '40..100Nm' },
    });
  });

  it('falls back to safe defaults', () => {
    const q = toProductQuery({ sort: 'nope', warehouse: 'berlin!', page: '-4', price: 'a..b' });
    expect(q).toMatchObject({ sort: 'featured', order: 'asc', page: 1 });
    expect(q.warehouse).toBeUndefined();
    expect(q.minPrice).toBeUndefined();
    expect(q.maxPrice).toBeUndefined();
  });
});

describe('price and range params', () => {
  it('reads dollar ranges with an open end', () => {
    expect(parsePrice('50..200')).toEqual({ min: 5000, max: 20000 });
    expect(parsePrice('..99.5')).toEqual({ min: undefined, max: 9950 });
    expect(parsePrice(undefined)).toEqual({});
  });

  it('reads and writes spec ranges with a unit', () => {
    expect(parseRangeParam('40..100Nm')).toEqual({ lo: 40, hi: 100, unit: 'Nm' });
    expect(parseRangeParam('354.03..885.07in·lb')).toEqual({ lo: 354.03, hi: 885.07, unit: 'in·lb' });
    expect(parseRangeParam('..100')).toEqual({ lo: undefined, hi: 100, unit: undefined });
    expect(parseRangeParam('18')).toEqual({ lo: 18, hi: 18, unit: undefined });
    expect(formatRangeParam(40, 100.1234567, 'Nm')).toBe('40..100.123Nm');
  });
});
