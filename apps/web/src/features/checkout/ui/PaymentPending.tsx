'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const EVERY_MS = 2000;
const TRIES = 15;

/**
 * Back from Stripe before its webhook arrived: the order is still unpaid here,
 * so re-render the page every few seconds until the webhook has confirmed it.
 */
export function PaymentPending() {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > TRIES) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <p role="status" className="mb-8 border-2 border-ink bg-paper px-4 py-3 text-[15px]">
      {gaveUp
        ? 'We are still waiting for the payment confirmation. Reload this page in a minute; you will not be charged twice.'
        : 'Confirming your payment…'}
    </p>
  );
}
