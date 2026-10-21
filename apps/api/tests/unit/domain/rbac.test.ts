import { describe, expect, it } from 'vitest';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from '../../../src/modules/identity/domain/rules/hasPermission';

describe('rbac hasPermission', () => {
  const perms = ['products:read', 'orders:create'];

  it('checks single / all / any', () => {
    expect(hasPermission(perms, 'products:read')).toBe(true);
    expect(hasAllPermissions(perms, ['products:read', 'orders:create'])).toBe(true);
    expect(hasAllPermissions(perms, ['products:read', 'admin:dashboard'])).toBe(false);
    expect(hasAnyPermission(perms, ['admin:dashboard', 'orders:create'])).toBe(true);
  });
});
