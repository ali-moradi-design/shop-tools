import { describe, expect, it } from 'vitest';
import { Money } from '../../../src/shared/domain/Money';
import { normalizeEmail } from '../../../src/shared/domain/Email';
import { normalizeIsbn, isValidIsbn } from '../../../src/shared/domain/Isbn';
import { DomainError } from '../../../src/shared/domain/DomainError';

describe('value helpers', () => {
  it('Money keeps integer cents and subtracts', () => {
    expect(Money.of(1012.5).amount).toBe(1013);
    expect(Money.of(10).subtract(Money.of(3)).amount).toBe(7);
  });

  it('Email / ISBN', () => {
    expect(normalizeEmail('  A@B.COM ')).toBe('a@b.com');
    expect(() => normalizeEmail('bad')).toThrow(DomainError);
    expect(isValidIsbn('978-0-13-235088-4')).toBe(true);
    expect(normalizeIsbn('9780132350884')).toBe('9780132350884');
  });
});
