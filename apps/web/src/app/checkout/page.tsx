import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requireAccount } from '@/features/auth/server';
import { CheckoutForm } from '@/features/checkout';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

async function Checkout() {
  // one request: profile and saved addresses
  const account = await requireAccount('/checkout');
  const address = account.addresses.find((a) => a.isDefault) ?? account.addresses[0];
  return <CheckoutForm name={account.name} address={address} savedCount={account.addresses.length} />;
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
