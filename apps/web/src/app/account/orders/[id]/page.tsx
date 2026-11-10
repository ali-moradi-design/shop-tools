import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { canCancel, orderNumber, RETURN_STATUS_LABEL, STATUS_LABEL, type Order, type ReturnRequest } from '@/entities/order';
import { CancelOrderButton, ReturnRequestForm, type ReturnableLine } from '@/features/account';
import { PaymentPending, PayNowButton } from '@/features/checkout';
import { requireUser } from '@/features/auth/server';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { WAREHOUSE_NAMES } from '@/shared/config';
import { trackServerConversion } from '@/shared/lib/ab/server';
import { early } from '@/shared/lib/early';
import { formatMoney } from '@/shared/lib/money';

export const metadata: Metadata = { title: 'Order', robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ checkout?: string }> };

async function OrderView({ params, searchParams }: Props) {
  const { id } = await params;
  // both reads start next to the session check; the returns list is empty for most orders
  const reads = early(
    Promise.all([
      serverApi<{ data: Order }>(`/orders/${encodeURIComponent(id)}`).then((r) => r.data),
      serverApi<{ data: ReturnRequest[] }>(`/returns/mine?order=${encodeURIComponent(id)}`).then((r) => r.data).catch(() => [] as ReturnRequest[]),
    ]),
  );
  await requireUser(`/account/orders/${id}`);
  let order: Order;
  let returns: ReturnRequest[];
  try {
    [order, returns] = await reads;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403 || err.status === 400)) notFound();
    throw err;
  }
  // the return URL proves nothing (anyone can open it); only the order's status counts
  const { checkout } = await searchParams;
  const unpaid = order.status === 'pending_payment';
  // the purchase counts for the visitor's A/B tests once the webhook has confirmed it
  if (checkout === 'success' && !unpaid) await trackServerConversion('purchase');
  const returnable = order.status === 'shipped' || order.status === 'completed' ? returnableLines(order, returns) : [];
  return (
    <>
      {checkout === 'success' && !unpaid && (
        <p role="status" className="mb-8 border-2 border-ink bg-accent px-4 py-3 text-[15px] text-accent-ink">
          Thank you! Your payment went through and your order is confirmed.
        </p>
      )}
      {checkout === 'success' && unpaid && <PaymentPending />}
      {checkout === 'cancelled' && unpaid && (
        <p role="status" className="mb-8 border-2 border-ink bg-paper px-4 py-3 text-[15px]">
          Payment cancelled. Nothing was charged; you can pay below whenever you are ready.
        </p>
      )}
      <Link href="/account" className="text-[13px] text-mute underline">← All orders</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h1 className="heading text-[32px]">Order {orderNumber(order.id)}</h1>
        <span className="eyebrow" data-testid="order-status">{STATUS_LABEL[order.status]}</span>
      </div>
      {order.shipment && (
        <p className="mt-4 text-[14px]" data-testid="tracking">
          Shipped with {order.shipment.carrier} · tracking{' '}
          {order.shipment.url ? (
            <a href={order.shipment.url} target="_blank" rel="noopener noreferrer" className="link-underline font-mono">{order.shipment.trackingNumber}</a>
          ) : (
            <span className="font-mono">{order.shipment.trackingNumber}</span>
          )}
        </p>
      )}
      {order.status === 'cancelled' && order.refunded && <p className="mt-4 text-[14px] text-mute">Your payment was refunded.</p>}
      <ul className="mt-6 border-t border-line">
        {order.items.map((i) => (
          <li key={i.sku} className="grid grid-cols-[80px_1fr_auto] items-center gap-4 border-b border-line py-4 text-[14.5px]">
            <div className="relative h-20 bg-soft">{i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-contain" />}</div>
            <div>{i.title}<div className="text-mute">{i.label} · Qty {i.quantity}</div>{i.allocations && i.allocations.length > 0 && <div className="font-mono text-[12px] text-steel" data-testid="order-allocations">Shipped from {i.allocations.map((a) => `${WAREHOUSE_NAMES[a.warehouse] ?? a.warehouse} (${a.quantity})`).join(', ')}</div>}</div>
            <div>{formatMoney(i.price * i.quantity)}</div>
          </li>
        ))}
      </ul>
      <dl className="ml-auto mt-4 max-w-xs space-y-1 text-[14.5px]">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalAmount)}</dd></div>
        {order.discountAmount > 0 && <div className="flex justify-between"><dt>Discount ({order.discountCode})</dt><dd>−{formatMoney(order.discountAmount)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping</dt><dd>Free</dd></div>
        <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd>{formatMoney(order.totalAmount)}</dd></div>
      </dl>
      <div className="mt-8 text-[14px]">
        <h2 className="eyebrow mb-2">Shipping to</h2>
        <p>{order.shippingAddress.fullName}<br />{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />{order.shippingAddress.city} {order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
      </div>
      {unpaid && checkout !== 'success' && <PayNowButton orderId={order.id} />}
      {canCancel(order.status) && (
        <div className="mt-6">
          <CancelOrderButton orderId={order.id} paid={order.payment.status === 'paid'} />
        </div>
      )}
      {returns.length > 0 && (
        <section className="mt-10" aria-labelledby="returns-heading">
          <h2 id="returns-heading" className="eyebrow mb-2">Returns</h2>
          <ul className="space-y-3 text-[14px]">
            {returns.map((r) => (
              <li key={r.id} className="panel p-4" data-testid="return">
                <p className="font-semibold">{RETURN_STATUS_LABEL[r.status]}</p>
                <p className="text-mute">{r.items.map((i) => `${i.quantity} × ${i.title} (${i.label})`).join(', ')}</p>
                {r.refundAmount > 0 && <p className="text-mute">Refund {formatMoney(r.refundAmount)}{r.refunded ? ' · sent' : ''}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {returnable.length > 0 && <ReturnRequestForm orderId={order.id} lines={returnable} />}
    </>
  );
}

/** Units of each line that are not in an earlier (not rejected) return. */
function returnableLines(order: Order, returns: ReturnRequest[]): ReturnableLine[] {
  const taken = new Map<string, number>();
  for (const r of returns) if (r.status !== 'rejected') for (const i of r.items) taken.set(i.sku, (taken.get(i.sku) ?? 0) + i.quantity);
  return order.items.map((i) => ({ title: i.title, label: i.label, price: i.price, available: Math.max(0, i.quantity - (taken.get(i.sku) ?? 0)) }));
}

export default function OrderPage(props: Props) {
  return (
    <div className="container-page max-w-3xl py-14">
      <Suspense fallback={<div className="h-64" />}>
        <OrderView {...props} />
      </Suspense>
    </div>
  );
}
