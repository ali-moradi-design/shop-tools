import Link from 'next/link';
import { Suspense } from 'react';
import type { Order } from '@/entities/order';
import { AdminNav, OrderStatusSelect } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { formatMoney } from '@/shared/lib/money';

async function Orders() {
  await requireAdmin('/admin/orders');
  const { data: orders } = await serverApi<{ data: Order[] }>('/orders');
  if (orders.length === 0) return <p className="text-mute">No orders yet.</p>;
  return (
    <table className="w-full text-left text-[14px]">
      <thead className="border-b border-line text-[11px] uppercase tracking-[0.16em] text-mute">
        <tr><th className="py-3 font-medium">Order</th><th className="font-medium">Date</th><th className="font-medium">Customer</th><th className="font-medium">Items</th><th className="font-medium">Total</th><th className="font-medium">Status</th></tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="border-b border-line" data-testid="admin-order">
            <td className="py-3"><Link className="link-underline" href={`/account/orders/${o.id}`}>#{o.id.slice(-6).toUpperCase()}</Link></td>
            <td>{new Date(o.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            <td>{o.shippingAddress.fullName}</td>
            <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
            <td>{formatMoney(o.totalAmount)}</td>
            <td><OrderStatusSelect orderId={o.id} status={o.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminOrdersPage() {
  return (
    <>
      <h1 className="heading mb-6 text-[32px]">Admin</h1>
      <AdminNav current="orders" />
      <Suspense fallback={<div className="h-64" />}>
        <Orders />
      </Suspense>
    </>
  );
}
