import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/features/auth';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Choose a New Password', referrer: 'no-referrer' };

type Props = { searchParams: Promise<{ token?: string }> };

async function Form({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token || !/^[a-f0-9]{64,128}$/.test(token)) {
    return (
      <p className="mt-8 text-center text-[15px]">
        This link is not complete. <Link href="/account/forgot-password" className="link-underline">Ask for a new one</Link>.
      </p>
    );
  }
  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage(props: Props) {
  return (
    <div className="container-page max-w-md py-16">
      <h1 className="heading text-center text-[32px]">Choose a New Password</h1>
      <Suspense fallback={<Skeleton className="mt-8 h-48 w-full" />}>
        <Form {...props} />
      </Suspense>
    </div>
  );
}
