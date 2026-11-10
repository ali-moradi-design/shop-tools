import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { requireUser } from '@/features/auth/server';
import { CheckoutSimulator, type SimulatedSession } from '@/features/checkout';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

/** The simulated Stripe Checkout page; `id` is the Checkout Session id. */
type Props = { params: Promise<{ id: string }> };

type Session = SimulatedSession & { orderId: string; status: string };

async function Simulator({ params }: Props) {
  const { id } = await params;
  await requireUser(`/pay/${id}`);
  let session: Session;
  try {
    session = (await serverApi<{ data: Session }>(`/payments/simulator/sessions/${encodeURIComponent(id)}`)).data;
  } catch (err) {
    // 404 also covers a shop that uses real Stripe, where this page does not exist
    if (err instanceof ApiError && [400, 403, 404].includes(err.status)) notFound();
    throw err;
  }
  if (session.status !== 'pending_payment') redirect(`/account/orders/${session.orderId}`);
  return <CheckoutSimulator session={session} />;
}

export default function PayPage(props: Props) {
  return (
    <div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Simulator {...props} />
      </Suspense>
    </div>
  );
}
