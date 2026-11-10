import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, RolesManager, type PermissionOption, type RoleRow } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Roles' };

interface ApiRole {
  id: string;
  name: string;
  description?: string;
  permissions: ({ id?: string; _id?: string } | string)[];
}

const idOf = (p: ApiRole['permissions'][number]) => (typeof p === 'string' ? p : p.id ?? p._id ?? '');

async function Roles() {
  const reads = early(
    Promise.all([
      serverApi<{ data: ApiRole[] }>('/roles'),
      serverApi<{ data: PermissionOption[] }>('/permissions'),
      serverApi<{ data: { roles: ({ id?: string; _id?: string } | string)[] }[] }>('/users'),
    ]),
  );
  await requireAdmin('/admin/roles');
  const [{ data: roles }, { data: permissions }, { data: users }] = await reads;
  const members = new Map<string, number>();
  for (const u of users) for (const r of u.roles) members.set(idOf(r), (members.get(idOf(r)) ?? 0) + 1);
  const rows: RoleRow[] = roles
    .map((r) => ({ id: r.id, name: r.name, description: r.description, permissionIds: r.permissions.map(idOf), members: members.get(r.id) ?? 0 }))
    .sort((a, b) => (a.name === 'admin' ? -1 : b.name === 'admin' ? 1 : a.name.localeCompare(b.name)));
  return <RolesManager roles={rows} permissions={permissions.map(({ id, slug, name, section }) => ({ id, slug, name, section }))} />;
}

export default function AdminRolesPage() {
  return (
    <div>
      <PageHeader title="Roles" />
      <p className="-mt-3 mb-6 text-[14px] text-mute">What each role may do. Give people a role on the Customers page. The admin and customer roles are built in.</p>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Roles />
      </Suspense>
    </div>
  );
}
