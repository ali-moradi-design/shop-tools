import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { orderNumber, STATUS_LABEL, type Order } from '@/entities/order';
import type { User } from '@/entities/user';
import { OrderStatusSelect, PageHeader } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { WAREHOUSE_NAMES } from '@/shared/config';
import { early } from '@/shared/lib/early';
import { formatMoney } from '@/shared/lib/money';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Order' };

type Props = { params: Promise<{ id: string }> };

const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

async function readOrder(id: string): Promise<Order> {
  try {
    return (await serverApi<{ data: Order }>(`/orders/${encodeURIComponent(id)}`)).data;
  } catch (err) {
    if (err instanceof ApiError && [400, 404].includes(err.status)) notFound();
    throw err;
  }
}

async function OrderDetail({ params }: Props) {
  const { id } = await params;
  const reading = early(readOrder(id));
  await requireAdmin(`/admin/orders/${id}`);
  const order = await reading;
  // the account may have been deleted since; the order still shows
  const customer = await serverApi<{ data: User }>(`/users/${encodeURIComponent(order.user)}`)
    .then((r) => r.data)
    .catch(() => null);
  const a = order.shippingAddress;
  return (
    <>
      <PageHeader title={`Order ${orderNumber(order.id)}`}>
        <span className="tag">{STATUS_LABEL[order.status]}</span>
      </PageHeader>
      <p className="-mt-3 mb-8 text-[14px] text-mute">Placed {date.format(new Date(order.createdAt))}</p>

      <section className="panel mb-10 p-5">
        <h2 className="heading mb-3 text-[18px]">Change status</h2>
        <OrderStatusSelect orderId={order.id} status={order.status} withNote />
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <h2 className="heading mb-3 text-[18px]">Items</h2>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li key={item.sku} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 py-3 text-[14px]">
                <span className="relative h-14 w-14 bg-paper">
                  {item.image && <Image src={item.image} alt="" fill sizes="56px" className="object-contain" />}
                </span>
                <span>
                  <Link prefetch={false} href={`/admin/products/${item.product}`} className="text-ink hover:underline">{item.title}</Link>
                  <span className="block text-mute">
                    {item.label} · <span className="font-mono">{item.sku}</span> · × {item.quantity}
                    {item.allocations?.length ? ` · from ${item.allocations.map((x) => `${WAREHOUSE_NAMES[x.warehouse] ?? x.warehouse} ${x.quantity}`).join(', ')}` : ''}
                  </span>
                </span>
                <span className="font-mono">{formatMoney(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="ml-auto mt-4 max-w-xs space-y-1 text-[14px]">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="font-mono">{formatMoney(order.subtotalAmount)}</dd></div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between"><dt className="text-mute">Discount {order.discountCode && `(${order.discountCode})`}</dt><dd className="font-mono">−{formatMoney(order.discountAmount)}</dd></div>
            )}
            <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink"><dt>Total</dt><dd className="font-mono">{formatMoney(order.totalAmount)}</dd></div>
          </dl>
        </section>

        <aside className="space-y-8 text-[14px]">
          <section>
            <h2 className="heading mb-2 text-[18px]">Customer</h2>
            {customer ? (
              <p>{customer.name}<br /><a href={`mailto:${customer.email}`} className="link-underline">{customer.email}</a></p>
            ) : (
              <p className="text-mute">Account no longer exists</p>
            )}
          </section>
          <section>
            <h2 className="heading mb-2 text-[18px]">Ship to</h2>
            <address className="not-italic leading-6">
              {a.fullName}<br />{a.line1}<br />{a.line2 && <>{a.line2}<br /></>}
              {a.city}{a.state ? `, ${a.state}` : ''} {a.postalCode}<br />{a.country}
            </address>
          </section>
          <section>
            <h2 className="heading mb-2 text-[18px]">Payment</h2>
            <p className="capitalize">{order.payment.status}{order.payment.paidAt && ` · ${date.format(new Date(order.payment.paidAt))}`}</p>
            {order.payment.transactionId && <p className="break-all font-mono text-[12px] text-mute">{order.payment.transactionId}</p>}
          </section>
          {order.statusHistory && order.statusHistory.length > 0 && (
            <section>
              <h2 className="heading mb-2 text-[18px]">History</h2>
              <ol className="space-y-3 border-l-2 border-ink pl-4">
                {[...order.statusHistory].reverse().map((h, i) => (
                  <li key={`${h.status}-${h.at}-${i}`}>
                    <span className="text-ink">{STATUS_LABEL[h.status]}</span>
                    <span className="block text-[12px] text-mute">{date.format(new Date(h.at))}</span>
                    {h.note && <span className="block text-mute">{h.note}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

export default function AdminOrderPage(props: Props) {
  return (
    <div>
      <Link href="/admin/orders" className="text-[13px] text-mute underline">← All orders</Link>
      <div className="mt-3">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <OrderDetail {...props} />
        </Suspense>
      </div>
    </div>
  );
}
