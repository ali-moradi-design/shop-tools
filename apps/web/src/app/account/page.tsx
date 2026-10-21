import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { STATUS_LABEL, type Order } from '@/entities/order';
import { SignOutButton } from '@/features/auth';
import { requireUser } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { formatMoney } from '@/shared/lib/money';

export const metadata: Metadata = { title: 'My Account', robots: { index: false } };

async function Account() {
  const user = await requireUser('/account');
  const { data: orders } = await serverApi<{ data: Order[] }>('/orders');
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="heading text-[32px]">Hello, {user.name.split(' ')[0]}</h1>
          <p className="text-mute">{user.email}</p>
        </div>
        <div className="flex gap-6">
          <Link href="/account/favorites" className="link-underline text-[14px]">Favorites</Link>
          <SignOutButton />
        </div>
      </div>
      <h2 className="heading mt-10 text-[24px]">Order History</h2>
      {orders.length === 0 ? (
        <p className="mt-4 text-mute">No orders yet. <Link className="link-underline text-ink" href="/collections/mens-boots">Start shopping</Link></p>
      ) : (
        <table className="mt-4 w-full text-left text-[14px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-[0.16em] text-mute">
            <tr><th className="py-3 font-medium">Order</th><th className="font-medium">Date</th><th className="font-medium">Status</th><th className="text-right font-medium">Total</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line" data-testid="order-row">
                <td className="py-4"><Link className="link-underline" href={`/account/orders/${o.id}`}>#{o.id.slice(-6).toUpperCase()}</Link></td>
                <td>{new Date(o.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td>
                <td>{STATUS_LABEL[o.status]}</td>
                <td className="text-right">{formatMoney(o.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function AccountPage() {
  return (
    <div className="container-page max-w-4xl py-14">
      <Suspense fallback={<div className="h-64" />}>
        <Account />
      </Suspense>
    </div>
  );
}
