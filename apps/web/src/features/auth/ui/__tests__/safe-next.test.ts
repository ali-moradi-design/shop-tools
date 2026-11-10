import { describe, expect, it } from 'vitest';
import { safeNext } from '../AuthForm';

describe('safeNext (open redirect guard)', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/checkout')).toBe('/checkout');
    expect(safeNext('/products/x?size=10#reviews')).toBe('/products/x?size=10#reviews');
  });

  it('rejects other hosts in every disguise', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', '\\\\evil.com', 'javascript:alert(1)', '/.//evil.com', '/a/..//evil.com', '/%2e//evil.com', '/\t/evil.com', undefined, '']) {
      expect(safeNext(bad)).toBe('/account');
    }
  });
});
