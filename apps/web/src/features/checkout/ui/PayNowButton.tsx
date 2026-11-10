'use client';

import { useState } from 'react';
import { startPayment } from '../api/startPayment';

export function PayNowButton({ orderId, className = 'btn mt-8' }: { orderId: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      await startPayment(orderId);
      // stays busy: the browser is leaving for the payment page
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the payment page');
      setBusy(false);
    }
  };
  return (
    <div>
      <button type="button" onClick={pay} disabled={busy} className={className}>
        {busy ? 'Opening payment…' : 'Pay now'}
      </button>
      {error && <p role="alert" className="mt-2 text-[14px] text-danger">{error}</p>}
    </div>
  );
}
