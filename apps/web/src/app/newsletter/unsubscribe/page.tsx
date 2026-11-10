import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { UnsubscribeButton } from '@/features/newsletter';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Unsubscribe', referrer: 'no-referrer' };

type Props = { searchParams: Promise<{ token?: string }> };

/** A button, not an automatic unsubscribe: mail scanners open links, and would unsubscribe people. */
async function Body({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) return <p className="mt-6">This link is not complete.</p>;
  return <UnsubscribeButton token={token} />;
}

export default function UnsubscribePage(props: Props) {
  return (
    <div className="container-page max-w-md py-20 text-center">
      <h1 className="heading text-[32px]">Newsletter</h1>
      <Suspense fallback={<Skeleton className="mx-auto mt-6 h-12 w-48" />}>
        <Body {...props} />
      </Suspense>
      <Link href="/" className="mt-10 inline-block text-[14px] text-mute underline">Back to the shop</Link>
    </div>
  );
}
