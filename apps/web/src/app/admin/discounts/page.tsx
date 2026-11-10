import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { Discount } from '@/entities/discount';
import { DiscountForm, DiscountsTable, PageHeader, type DiscountRow } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Discounts' };

/** Decided at request time, so the browser never shows a different answer. */
function withState(discounts: Discount[]): DiscountRow[] {
  const now = Date.now();
  return discounts.map((d) => ({
    ...d,
    state: !d.isActive
      ? 'Paused'
      : d.endsAt && new Date(d.endsAt).getTime() < now
        ? 'Expired'
        : d.maxUses !== undefined && d.usedCount >= d.maxUses
          ? 'Used up'
          : 'Active',
  }));
}

async function Discounts() {
  const list = early(serverApi<{ data: Discount[] }>('/discounts'));
  await requireAdmin('/admin/discounts');
  const { data } = await list;
  return (
    <>
      <h2 className="heading mb-3 text-[18px]">New code</h2>
      <DiscountForm />
      <h2 className="heading mb-3 mt-10 text-[18px]">All codes</h2>
      <DiscountsTable rows={withState(data)} />
    </>
  );
}

export default function DiscountsPage() {
  return (
    <div>
      <PageHeader title="Discounts" />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Discounts />
      </Suspense>
    </div>
  );
}
