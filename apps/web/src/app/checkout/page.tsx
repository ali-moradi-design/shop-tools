import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requireUser } from '@/features/auth/server';
import { CheckoutForm } from '@/features/checkout';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

async function Checkout() {
  const user = await requireUser('/checkout');
  return <CheckoutForm name={user.name} />;
}

export default function CheckoutPage() {
  return (
    <div className="container-page max-w-6xl py-14">
      <h1 className="heading mb-8 text-[32px]">Checkout</h1>
      <Suspense fallback={<div className="h-96" />}>
        <Checkout />
      </Suspense>
    </div>
  );
}
