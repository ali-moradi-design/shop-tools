import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { RETURN_STATUS_LABEL, type ReturnRequest, type ReturnStatus } from '@/entities/order';
import { PageHeader, Pagination, ReturnsTable } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { cn } from '@/shared/lib/cn';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Returns' };

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

const TABS: (ReturnStatus | undefined)[] = [undefined, 'requested', 'approved', 'received', 'refunded', 'rejected'];
const LIMIT = 30;

async function Returns({ searchParams }: Props) {
  const sp = await searchParams;
  const status = TABS.includes(sp.status as ReturnStatus) ? (sp.status as ReturnStatus) : undefined;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const list = early(serverApi<{ data: ReturnRequest[]; meta: { total: number } }>(`/returns?page=${page}&limit=${LIMIT}${status ? `&status=${status}` : ''}`));
  await requireAdmin('/admin/returns');
  const { data, meta } = await list;
  return (
    <>
      <nav aria-label="Filter by status" className="no-scrollbar -mx-4 mb-5 flex gap-5 overflow-x-auto border-b border-line px-4 text-[14px] sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t ?? 'all'}
            href={t ? `/admin/returns?status=${t}` : '/admin/returns'}
            aria-current={t === status ? 'page' : undefined}
            className={cn('whitespace-nowrap pb-2', t === status ? '-mb-px border-b-4 border-accent font-semibold text-ink' : 'text-mute hover:text-ink')}
          >
            {t ? RETURN_STATUS_LABEL[t].split(' —')[0] : 'All'}
          </Link>
        ))}
      </nav>
      <ReturnsTable rows={data} />
      <Pagination path="/admin/returns" params={{ status }} page={page} pages={Math.ceil(meta.total / LIMIT)} total={meta.total} noun="returns" />
    </>
  );
}

export default function AdminReturnsPage(props: Props) {
  return (
    <div>
      <PageHeader title="Returns" />
      <p className="-mt-3 mb-5 text-[14px] text-mute">Approve, mark received, then refund. Each step emails the customer; refunds go back through Stripe.</p>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Returns {...props} />
      </Suspense>
    </div>
  );
}
