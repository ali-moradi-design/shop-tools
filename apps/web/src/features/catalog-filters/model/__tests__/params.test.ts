import { describe, expect, it } from 'vitest';
import { readFilters, toProductQuery } from '../params';

describe('catalog URL params', () => {
  it('keeps known keys only and takes the first value', () => {
    expect(readFilters({ size: ['10', '11'], color: 'Brown', evil: 'x' })).toEqual({ size: '10', color: 'Brown' });
  });

  it('maps sort names and guards the page number', () => {
    expect(toProductQuery({ sort: 'price-desc', page: '-3' })).toMatchObject({ sort: 'price', order: 'desc', page: 1 });
    expect(toProductQuery({})).toMatchObject({ sort: 'featured', order: 'asc', page: 1 });
  });
});
