import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Create Account', robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

async function Form({ searchParams }: Props) {
  return <AuthForm mode="register" next={(await searchParams).next} />;
}

export default function RegisterPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<div className="h-[520px]" />}>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}
