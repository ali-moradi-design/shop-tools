import type { repos } from '../../shared/composition/repos';
import { passwordHasher } from '../../modules/identity';

type Repos = typeof repos;

const SECTIONS = ['products', 'users', 'roles', 'permissions', 'orders', 'reviews', 'reports', 'discounts'] as const;
const CRUD = ['create', 'read', 'update', 'delete'] as const;

export function basePermissions() {
  const perms: { slug: string; name: string; description: string; section: string }[] = [];
  for (const section of SECTIONS) {
    for (const action of CRUD) {
      perms.push({
        slug: `${section}:${action}`,
        name: `${section} ${action}`,
        description: `Can ${action} ${section}`,
        section,
      });
    }
  }
  const extras = [
    { slug: 'orders:read-own', name: 'orders read own', description: 'Read own orders', section: 'orders' },
    { slug: 'orders:update-status', name: 'orders update status', description: 'Update order status', section: 'orders' },
    { slug: 'reviews:update-own', name: 'reviews update own', description: 'Update own reviews', section: 'reviews' },
    { slug: 'reviews:delete-own', name: 'reviews delete own', description: 'Delete own reviews', section: 'reviews' },
    { slug: 'users:read-own', name: 'users read own', description: 'Read own profile', section: 'users' },
    { slug: 'users:update-own', name: 'users update own', description: 'Update own profile', section: 'users' },
    { slug: 'reports:analytics', name: 'reports analytics', description: 'View analytics', section: 'reports' },
    { slug: 'reports:manage', name: 'reports manage', description: 'Manage issue reports', section: 'reports' },
    { slug: 'reports:issues:create', name: 'reports issues create', description: 'Create issue reports', section: 'reports' },
    { slug: 'admin:dashboard', name: 'admin dashboard', description: 'Access admin dashboard endpoints', section: 'admin' },
  ];
  return [...perms, ...extras];
}

/**
 * Admin sign-in. Development and tests use a well-known default; production must
 * set ADMIN_PASSWORD (12+ characters) so the live admin is not public.
 */
export function adminCredentials(): { email: string; password: string } {
  const email = process.env.ADMIN_EMAIL ?? 'admin@shop-tools.local';
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
    return { email, password };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set ADMIN_PASSWORD (12+ characters) before seeding in production');
  }
  return { email, password: 'Admin123!' };
}

export const DEMO_CUSTOMER = { email: 'demo@shop-tools.local', password: 'Demo123!' };

export const CUSTOMER_SLUGS = [
  'products:read',
  'orders:create',
  'orders:read-own',
  'reviews:create',
  'reviews:read',
  'reviews:update-own',
  'reviews:delete-own',
  'reports:issues:create',
  'users:read-own',
  'users:update-own',
];

export async function seedIdentity(repos: Repos): Promise<void> {
  const defs = basePermissions();
  for (const def of defs) {
    await repos.permissions.upsertBySlug(def.slug, def);
  }
  const allPerms = await repos.permissions.list();

  const adminRole = await repos.roles.upsertByName('admin', {
    name: 'admin',
    description: 'Full access',
    permissions: allPerms.map((p) => p.id),
  });

  const customerPermIds = allPerms
    .filter((p) => CUSTOMER_SLUGS.includes(p.slug))
    .map((p) => p.id);
  const customerRole = await repos.roles.upsertByName('customer', {
    name: 'customer',
    description: 'Default customer role',
    permissions: customerPermIds,
  });

  const admin = adminCredentials();
  const passwordHash = await passwordHasher.hash(admin.password);
  const existingAdmin = await repos.users.findByEmail(admin.email);
  if (existingAdmin) {
    await repos.users.update(existingAdmin.id, {
      name: 'Admin',
      passwordHash,
      roles: [adminRole.id],
      isActive: true,
    });
  } else {
    await repos.users.create({
      name: 'Admin',
      email: admin.email,
      passwordHash,
      roles: [adminRole.id],
      isActive: true,
    });
  }

  // Demo customer shown on the sign-in page.
  const demoHash = await passwordHasher.hash(DEMO_CUSTOMER.password);
  const existingDemo = await repos.users.findByEmail(DEMO_CUSTOMER.email);
  if (existingDemo) {
    await repos.users.update(existingDemo.id, { passwordHash: demoHash, roles: [customerRole.id], isActive: true });
  } else {
    await repos.users.create({
      name: 'Demo Customer',
      email: DEMO_CUSTOMER.email,
      passwordHash: demoHash,
      roles: [customerRole.id],
      isActive: true,
    });
  }
}
