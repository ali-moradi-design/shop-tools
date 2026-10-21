import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Sign In', robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

async function Form({ searchParams }: Props) {
  return <AuthForm mode="login" next={(await searchParams).next} />;
}

export default function LoginPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<div className="h-[520px]" />}>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}
