import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm, GuestCheckoutForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Sign In', robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

async function Form({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <>
      <AuthForm mode="login" next={next} />
      {/* only on the way to checkout: elsewhere a guest account has nothing to do */}
      {next?.startsWith('/checkout') && <GuestCheckoutForm next={next} />}
    </>
  );
}

export default function LoginPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<div className="h-[520px]" />}>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}
