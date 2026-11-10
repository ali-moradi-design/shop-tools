import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmailsTable, PageHeader, Pagination, SubscribersTable, type EmailRow, type SubscriberRow } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Emails' };

type Props = { searchParams: Promise<{ page?: string; to?: string }> };

const LIMIT = 30;

async function Emails({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const to = sp.to?.trim().slice(0, 200) || undefined;
  const reads = early(
    Promise.all([
      serverApi<{ data: EmailRow[]; meta: { total: number; transport: 'smtp' | 'outbox' } }>(`/emails?page=${page}&limit=${LIMIT}${to ? `&to=${encodeURIComponent(to)}` : ''}`),
      serverApi<{ data: SubscriberRow[]; meta: { total: number } }>('/newsletter?limit=10'),
    ]),
  );
  await requireAdmin('/admin/emails');
  const [{ data, meta }, subs] = await reads;
  return (
    <>
      <p className="-mt-3 mb-5 text-[14px] text-mute">
        {meta.transport === 'smtp'
          ? 'Sent through SMTP. A copy of each message is kept here for 90 days.'
          : 'No SMTP server is set (SMTP_URL), so messages are kept here instead of sent. Open one to read it.'}
      </p>
      <form className="mb-5 flex max-w-md text-[14px]" role="search">
        <label htmlFor="emails-to" className="sr-only">Recipient</label>
        <input id="emails-to" name="to" type="email" defaultValue={to} placeholder="Filter by recipient" className="field" />
        <button type="submit" className="btn btn-dark shrink-0">Filter</button>
      </form>
      <EmailsTable rows={data} />
      <Pagination path="/admin/emails" params={{ to }} page={page} pages={Math.ceil(meta.total / LIMIT)} total={meta.total} noun="emails" />

      <section className="mt-14">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="heading text-[22px]">Newsletter · {subs.meta.total} subscribers</h2>
        </div>
        <SubscribersTable rows={subs.data} />
      </section>
    </>
  );
}

export default function AdminEmailsPage(props: Props) {
  return (
    <div>
      <PageHeader title="Emails" />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Emails {...props} />
      </Suspense>
    </div>
  );
}
