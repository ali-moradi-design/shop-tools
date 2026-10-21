'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientApi } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/money';

const DECLINE_CARD = '4000 0000 0000 0002';

/**
 * Simulated payment gateway (demo). The approve card confirms the payment through
 * the API's fake payment method; the decline card fails without charging.
 */
export function FakeGateway({ orderId, amount }: { orderId: string; amount: number }) {
  const router = useRouter();
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 600));
    if (card.replace(/\s/g, '') === DECLINE_CARD.replace(/\s/g, '')) {
      setError('Your card was declined. Try another card.');
      setBusy(false);
      return;
    }
    try {
      await clientApi(`/orders/${orderId}/pay`, { method: 'POST' });
      router.replace(`/account/orders/${orderId}?paid=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setBusy(false);
    }
  };

  const field = 'mt-1 block w-full rounded-md border border-[#d0d5dd] px-3 py-2.5 outline-none focus:border-[#444]';
  return (
    <div className="mx-auto my-14 max-w-md rounded-xl border border-[#d0d5dd] p-8 font-sans shadow-sm">
      <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-mute">Welt Pay · test gateway</p>
      <p className="mt-2 text-[30px] font-medium" data-testid="pay-amount">{formatMoney(amount)}</p>
      <p className="text-[13px] text-mute">Order #{orderId.slice(-6).toUpperCase()} — no real money is charged.</p>
      <form className="mt-6 space-y-4 text-[14px]" onSubmit={(e) => { e.preventDefault(); void pay(); }}>
        <label className="block">Card number<input value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" autoComplete="cc-number" className={field} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Expiry<input defaultValue="12 / 30" autoComplete="cc-exp" className={field} /></label>
          <label className="block">CVC<input defaultValue="123" autoComplete="cc-csc" className={field} /></label>
        </div>
        <p className="text-[12px] text-mute">Approve: 4242 4242 4242 4242 · Decline: {DECLINE_CARD}</p>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <button type="submit" disabled={busy} className="btn w-full rounded-md normal-case tracking-normal">
          {busy ? 'Processing…' : `Pay ${formatMoney(amount)}`}
        </button>
        <button type="button" onClick={() => router.push(`/account/orders/${orderId}`)} className="block w-full text-center text-[13px] text-mute underline">
          Cancel and return to the shop
        </button>
      </form>
    </div>
  );
}
