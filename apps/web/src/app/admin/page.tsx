import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { orderNumber, STATUS_LABEL, type Order, type OrderStatus } from '@/entities/order';
import type { Product } from '@/entities/product';
import { BarList, PageHeader, RevenueChart, type DayPoint } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { formatMoney } from '@/shared/lib/money';
import { Skeleton } from '@/shared/ui';

interface Summary {
  users: number;
  products: number;
  orders: number;
  revenue: number;
  lowStock: number;
}

const DAYS = 30;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Every one of the last 30 days, with 0 for days without sales. */
function fillDays(rows: DayPoint[], today: Date): DayPoint[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (DAYS - 1 - i));
    const key = isoDay(d);
    return byDate.get(key) ?? { date: key, revenue: 0, orders: 0 };
  });
}

async function Dashboard() {
  // every page renders per request, so "today" is the request's day
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - (DAYS - 1));
  const range = `from=${isoDay(from)}`;
  // one round of parallel reads, started next to the session check
  const reads = early(
    Promise.all([
      serverApi<{ data: Summary }>('/admin/dashboard/summary'),
      serverApi<{ data: Product[] }>('/admin/dashboard/low-stock?threshold=5'),
      serverApi<{ data: Order[] }>('/admin/dashboard/recent-orders?limit=6'),
      serverApi<{ data: DayPoint[] }>(`/reports/analytics/sales-by-date?${range}`),
      serverApi<{ data: { totalRevenue: number; orderCount: number; avgOrderValue: number } }>(`/reports/analytics/revenue?${range}`),
      serverApi<{ data: { status: OrderStatus; count: number }[] }>('/reports/analytics/orders-by-status'),
      serverApi<{ data: { _id: string; title: string; quantitySold: number }[] }>(`/reports/analytics/top-products?${range}&limit=6`),
    ]),
  );
  await requireAdmin('/admin');
  const [{ data: s }, { data: low }, { data: recent }, { data: sales }, { data: period }, { data: byStatus }, { data: top }] = await reads;

  const tiles = [
    ['Revenue, 30 days', formatMoney(period.totalRevenue), `${formatMoney(s.revenue)} all time`],
    ['Paid orders, 30 days', period.orderCount, `${s.orders} orders in total`],
    ['Average order', formatMoney(Math.round(period.avgOrderValue)), 'last 30 days'],
    ['Customers', s.users, 'accounts'],
    ['Low stock', s.lowStock, `of ${s.products} products`],
  ] as const;

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map(([k, v, note]) => (
          <div key={k} className="panel p-4">
            <dt className="text-[11px] uppercase tracking-[0.16em] text-mute">{k}</dt>
            <dd className="mt-2 font-mono text-[24px] font-semibold" data-testid={`kpi-${k}`}>{v}</dd>
            <dd className="text-[12px] text-mute">{note}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="heading text-[20px]">Revenue per day</h2>
        <p className="mb-3 text-[13px] text-mute">Paid orders, last 30 days (UTC)</p>
        <RevenueChart points={fillDays(sales, today)} />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="heading mb-4 text-[20px]">Paid orders by status</h2>
          {byStatus.length === 0 && <p className="text-[14px] text-mute">No orders yet.</p>}
          <BarList
            items={byStatus
              .filter((r) => r.count > 0)
              .sort((a, b) => b.count - a.count)
              .map((r) => ({ label: STATUS_LABEL[r.status] ?? r.status, value: r.count, href: `/admin/orders?status=${r.status}` }))}
          />
        </section>
        <section>
          <h2 className="heading mb-4 text-[20px]">Best sellers, 30 days</h2>
          {top.length ? (
            <BarList
              items={top.map((p) => ({ label: p.title, value: p.quantitySold, href: `/admin/products/${p._id}` }))}
              format={(n) => `${n} sold`}
            />
          ) : (
            <p className="text-[14px] text-mute">No sales in the last 30 days.</p>
          )}
        </section>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="heading text-[20px]">Latest orders</h2>
            <Link href="/admin/orders" className="text-[13px] text-mute underline underline-offset-4">All orders</Link>
          </div>
          <ul className="divide-y divide-line border-y border-line text-[14px]">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link prefetch={false} href={`/admin/orders/${o.id}`} className="link-underline">{orderNumber(o.id)}</Link>
                <span className="flex-1 truncate">{o.shippingAddress.fullName}</span>
                <span className="text-mute">{STATUS_LABEL[o.status]}</span>
                <span>{formatMoney(o.totalAmount)}</span>
              </li>
            ))}
            {recent.length === 0 && <li className="py-3 text-mute">No orders yet.</li>}
          </ul>
        </section>
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="heading text-[20px]">Running low</h2>
            <Link href="/admin/products?stock=low&sort=stock&order=asc" className="text-[13px] text-mute underline underline-offset-4">All low stock</Link>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {low.slice(0, 6).map((p) => (
              <li key={p.id} className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 py-2 text-[14px]">
                <div className="relative h-10 bg-paper">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" className="object-contain" />}</div>
                <span className="truncate">{p.title}</span>
                <span className={p.stock === 0 ? 'text-danger' : 'text-mute'}>{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</span>
                <Link prefetch={false} href={`/admin/products/${p.id}`} className="link-underline">Restock</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)}
      </div>
      <Skeleton className="mt-10 h-[260px] w-full" />
    </div>
  );
}

export default function AdminPage() {
  return (
    <div>
      <PageHeader title="Dashboard" />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
