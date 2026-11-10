import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { Suspense } from 'react';
import { ORDER_STATUSES, STATUS_LABEL, type Order, type OrderStatus } from '@/entities/order';
import { OrdersTable, PageHeader, Pagination, type OrderRow } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import type { ApiPaginated } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { cn } from '@/shared/lib/cn';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Orders' };

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string }> };

const TABS: (OrderStatus | undefined)[] = [undefined, 'paid', 'processing', 'shipped', 'pending_payment', 'completed', 'cancelled'];

const toRow = (o: Order): OrderRow => ({
  id: o.id,
  createdAt: o.createdAt,
  customer: o.shippingAddress.fullName,
  items: o.items.reduce((n, i) => n + i.quantity, 0),
  total: o.totalAmount,
  status: o.status,
});

async function Orders({ searchParams }: Props) {
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const qs = new URLSearchParams({ page: String(page), limit: '25', ...(status && { status }), ...(q && { q }) });
  const list = early(serverApi<ApiPaginated<Order>>(`/orders?${qs}`));
  await requireAdmin('/admin/orders');
  const { data, meta } = await list;
  const tabHref = (s?: OrderStatus) => {
    const p = new URLSearchParams({ ...(s && { status: s }), ...(q && { q }) }).toString();
    return p ? `/admin/orders?${p}` : '/admin/orders';
  };
  return (
    <>
      <nav aria-label="Order status" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 text-[13px]">
          {TABS.map((s) => (
            <li key={s ?? 'all'}>
              <Link
                href={tabHref(s)}
                aria-current={s === status ? 'page' : undefined}
                className={cn('block whitespace-nowrap border-2 px-3 py-1.5', s === status ? 'border-ink bg-ink text-accent' : 'border-line bg-paper hover:border-ink')}
              >
                {s ? STATUS_LABEL[s] : 'All'}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Form action="/admin/orders" className="mb-5 flex max-w-md" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="order-q" className="sr-only">Search orders</label>
        <input id="order-q" name="q" defaultValue={q} maxLength={100} placeholder="Order number, name or e-mail" className="field" />
        <button type="submit" className="btn btn-dark shrink-0">Search</button>
      </Form>
      <OrdersTable rows={data.map(toRow)} />
      <Pagination path="/admin/orders" params={{ status, q }} page={meta.page} pages={meta.pages} total={meta.total} noun="orders" />
    </>
  );
}

export default function AdminOrdersPage(props: Props) {
  return (
    <div>
      <PageHeader title="Orders">
        <a href="/api/v1/admin/export/orders.csv" download className="text-[14px] text-mute underline underline-offset-4">Export CSV</a>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Orders {...props} />
      </Suspense>
    </div>
  );
}
