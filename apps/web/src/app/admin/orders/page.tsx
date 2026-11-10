import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Order } from '@/entities/order';
import { OrderStatusSelect, PageHeader } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { formatMoney } from '@/shared/lib/money';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Orders' };

async function Orders() {
  const list = early(serverApi<{ data: Order[] }>('/orders'));
  await requireAdmin('/admin/orders');
  const { data: orders } = await list;
  if (orders.length === 0) return <p className="text-mute">No orders yet.</p>;
  return (
    <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead className="border-b border-line text-[11px] uppercase tracking-[0.16em] text-mute">
          <tr><th className="py-3 font-medium">Order</th><th className="font-medium">Date</th><th className="font-medium">Customer</th><th className="font-medium">Items</th><th className="font-medium">Total</th><th className="font-medium">Status</th></tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-line" data-testid="admin-order">
              <td className="py-3"><Link className="link-underline" prefetch={false} href={`/account/orders/${o.id}`}>#{o.id.slice(-6).toUpperCase()}</Link></td>
              <td>{new Date(o.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td>{o.shippingAddress.fullName}</td>
              <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
              <td>{formatMoney(o.totalAmount)}</td>
              <td><OrderStatusSelect orderId={o.id} status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <>
      <PageHeader title="Orders" />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Orders />
      </Suspense>
    </>
  );
}
