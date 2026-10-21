import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import type { Order } from '@/entities/order';
import { requireUser } from '@/features/auth/server';
import { FakeGateway } from '@/features/checkout';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';

export const metadata: Metadata = { title: 'Payment', robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

async function Gateway({ params }: Props) {
  const { id } = await params;
  await requireUser(`/pay/${id}`);
  let order: Order;
  try {
    order = (await serverApi<{ data: Order }>(`/orders/${encodeURIComponent(id)}`)).data;
  } catch (err) {
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) notFound();
    throw err;
  }
  if (order.status !== 'pending_payment') redirect(`/account/orders/${order.id}`);
  return <FakeGateway orderId={order.id} amount={order.totalAmount} />;
}

export default function PayPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <Gateway {...props} />
    </Suspense>
  );
}
