import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuditTable, PageHeader, Pagination, type AuditRow } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Activity' };

type Props = { searchParams: Promise<{ page?: string }> };

const LIMIT = 50;

async function Activity({ searchParams }: Props) {
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);
  const list = early(serverApi<{ data: AuditRow[]; meta: { total: number } }>(`/admin/audit?page=${page}&limit=${LIMIT}`));
  await requireAdmin('/admin/activity');
  const { data, meta } = await list;
  return (
    <>
      <AuditTable rows={data} />
      <Pagination path="/admin/activity" params={{}} page={page} pages={Math.ceil(meta.total / LIMIT)} total={meta.total} noun="changes" />
    </>
  );
}

export default function AdminActivityPage(props: Props) {
  return (
    <div>
      <PageHeader title="Activity" />
      <p className="-mt-3 mb-5 text-[14px] text-mute">Every change made by staff in the last year, newest first.</p>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Activity {...props} />
      </Suspense>
    </div>
  );
}
