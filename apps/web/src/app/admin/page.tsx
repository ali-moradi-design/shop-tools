import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Product } from '@/entities/product';
import { PageHeader } from '@/features/admin';
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

async function Dashboard() {
  const reads = early(
    Promise.all([
      serverApi<{ data: Summary }>('/admin/dashboard/summary'),
      serverApi<{ data: Product[] }>('/admin/dashboard/low-stock?threshold=5'),
    ]),
  );
  await requireAdmin('/admin');
  const [{ data: s }, { data: low }] = await reads;
  const tiles = [
    ['Revenue (paid)', formatMoney(s.revenue)],
    ['Orders', s.orders],
    ['Customers', s.users],
    ['Products', s.products],
    ['Low stock (≤5)', s.lowStock],
  ] as const;
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map(([k, v]) => (
          <div key={k} className="border border-line p-5">
            <dt className="text-[11px] uppercase tracking-[0.16em] text-mute">{k}</dt>
            <dd className="heading mt-2 text-[28px]" data-testid={`kpi-${k}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <h2 className="heading mb-4 mt-12 text-[22px]">Running low</h2>
      <ul className="divide-y divide-line border-y border-line">
        {low.slice(0, 12).map((p) => (
          <li key={p.id} className="grid grid-cols-[48px_1fr_auto_auto] items-center gap-4 py-3 text-[14px]">
            <div className="relative h-12 bg-paper">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="48px" className="object-contain" />}</div>
            <span>{p.title}</span>
            <span className="text-mute">{p.stock} left</span>
            <Link href={`/admin/products/${p.id}`} className="link-underline" prefetch={false}>Restock</Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
