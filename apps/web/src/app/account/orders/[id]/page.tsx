import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { STATUS_LABEL, type Order } from '@/entities/order';
import { requireUser } from '@/features/auth/server';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { formatMoney } from '@/shared/lib/money';

export const metadata: Metadata = { title: 'Order', robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> };

async function OrderView({ params, searchParams }: Props) {
  const { id } = await params;
  await requireUser(`/account/orders/${id}`);
  let order: Order;
  try {
    order = (await serverApi<{ data: Order }>(`/orders/${encodeURIComponent(id)}`)).data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403 || err.status === 400)) notFound();
    throw err;
  }
  const justPaid = (await searchParams).paid === '1' && order.status === 'paid';
  return (
    <>
      {justPaid && (
        <p role="status" className="mb-8 border border-ink px-4 py-3 text-[15px]">
          Thank you! Your payment went through and your order is confirmed.
        </p>
      )}
      <Link href="/account" className="text-[13px] text-mute underline">← All orders</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h1 className="heading text-[32px]">Order #{order.id.slice(-6).toUpperCase()}</h1>
        <span className="eyebrow" data-testid="order-status">{STATUS_LABEL[order.status]}</span>
      </div>
      <ul className="mt-6 border-t border-line">
        {order.items.map((i) => (
          <li key={i.sku} className="grid grid-cols-[80px_1fr_auto] items-center gap-4 border-b border-line py-4 text-[14.5px]">
            <div className="relative h-20 bg-soft">{i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-contain" />}</div>
            <div>{i.title}<div className="text-mute">Size {i.size}{i.width ? ` · ${i.width}` : ''} · Qty {i.quantity}</div></div>
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
      {order.status === 'pending_payment' && (
        <Link href={`/pay/${order.id}`} className="btn mt-8">Pay now</Link>
      )}
    </>
  );
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
