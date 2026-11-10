import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CustomersTable, PageHeader, type CustomerRow } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Customers' };

interface ApiUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  roles: ({ _id?: string; id?: string; name: string } | string)[];
}

const roleId = (r: ApiUser['roles'][number]) => (typeof r === 'string' ? r : r._id ?? r.id ?? '');

async function Customers() {
  const reads = early(
    Promise.all([serverApi<{ data: ApiUser[] }>('/users'), serverApi<{ data: { id: string; name: string }[] }>('/roles')]),
  );
  const me = await requireAdmin('/admin/customers');
  const [{ data: users }, { data: roles }] = await reads;
  const adminRoleId = roles.find((r) => r.name === 'admin')?.id;
  // only these fields reach the browser (not the populated roles and permissions)
  const rows: CustomerRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    joined: u.createdAt,
    roleIds: u.roles.map(roleId).filter(Boolean),
    isAdmin: u.roles.some((r) => (typeof r === 'string' ? r === adminRoleId : r.name === 'admin')),
  }));
  return <CustomersTable rows={rows} meId={me.id} adminRoleId={adminRoleId} />;
}

export default function CustomersPage() {
  return (
    <div>
      <PageHeader title="Customers">
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Customers />
      </Suspense>
    </div>
  );
}
