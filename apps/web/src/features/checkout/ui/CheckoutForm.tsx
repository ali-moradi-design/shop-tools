'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Cart } from '@/features/cart';
import { useCart } from '@/features/cart';
import { clientApi } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/money';

type Quote = Cart & { discountCode?: string; discountAmount: number; total: number };

export function CheckoutForm({ name }: { name: string }) {
  const router = useRouter();
  const { refresh } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    clientApi<{ data: Quote }>('/cart/quote', { method: 'POST', body: '{}' })
      .then((r) => setQuote(r.data))
      .catch((e: Error) => setError(e.message));
  }, []);

  const applyCode = async () => {
    setCodeError(null);
    try {
      const body = JSON.stringify(code ? { discountCode: code } : {});
      setQuote((await clientApi<{ data: Quote }>('/cart/quote', { method: 'POST', body })).data);
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : 'Invalid code');
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const shippingAddress = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!shippingAddress.line2) delete shippingAddress.line2;
    try {
      const { data } = await clientApi<{ data: { id: string } }>('/cart/checkout', {
        method: 'POST',
        body: JSON.stringify({ shippingAddress, ...(quote?.discountCode ? { discountCode: quote.discountCode } : {}) }),
      });
      await refresh();
      router.push(`/pay/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  };

  if (quote && quote.items.length === 0) {
    return <p className="py-10 text-center text-mute">Your cart is empty.</p>;
  }

  const field = 'mt-1 block w-full border border-line px-3 py-2.5 outline-none focus:border-ink';
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
      <form id="checkout" onSubmit={onSubmit} className="grid grid-cols-2 gap-4 text-[14px]">
        <h2 className="heading col-span-2 text-[22px]">Shipping address</h2>
        <p className="col-span-2 border border-line bg-soft px-3 py-2 text-[13px]">
          Demo shop: please don’t enter real personal data. The demo account is shared and all orders are deleted every night.
        </p>
        <label className="col-span-2">Full name<input name="fullName" required defaultValue={name} autoComplete="name" className={field} /></label>
        <label className="col-span-2">Address<input name="line1" required autoComplete="address-line1" className={field} /></label>
        <label className="col-span-2">Apartment, suite (optional)<input name="line2" autoComplete="address-line2" className={field} /></label>
        <label>City<input name="city" required autoComplete="address-level2" className={field} /></label>
        <label>State / region<input name="state" autoComplete="address-level1" className={field} /></label>
        <label>Postal code<input name="postalCode" required autoComplete="postal-code" className={field} /></label>
        <label>Country<input name="country" required defaultValue="United States" autoComplete="country-name" className={field} /></label>
      </form>
      <aside className="self-start border border-line bg-soft p-6" aria-label="Order summary">
        <h2 className="heading text-[22px]">Order summary</h2>
        {!quote ? (
          <p className="mt-4 text-mute">Loading…</p>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {quote.items.map((i) => (
                <li key={i.productId + i.sku} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 text-[14px]">
                  <div className="relative h-14 bg-white">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-contain" />}</div>
                  <div>{i.title}<div className="text-mute">Size {i.size} · Qty {i.quantity}</div></div>
                  <div>{formatMoney(i.price * i.quantity)}</div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex border border-line bg-white">
              <label htmlFor="code" className="sr-only">Discount code</label>
              <input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Discount code (try WELCOME10)" className="min-w-0 flex-1 px-3 py-2.5 text-[14px] outline-none" />
              <button type="button" onClick={applyCode} className="border-l border-line px-4 text-[11px] font-medium tracking-[0.16em]">APPLY</button>
            </div>
            {codeError && <p role="alert" className="mt-2 text-[13px] text-danger">{codeError}</p>}
            <dl className="mt-5 space-y-1 text-[14.5px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(quote.subtotal)}</dd></div>
              {quote.discountAmount > 0 && (
                <div className="flex justify-between"><dt>Discount ({quote.discountCode})</dt><dd>−{formatMoney(quote.discountAmount)}</dd></div>
              )}
              <div className="flex justify-between"><dt>Shipping</dt><dd>Free</dd></div>
              <div className="flex justify-between border-t border-line pt-3 font-serif text-[22px] font-bold"><dt>Total</dt><dd data-testid="checkout-total">{formatMoney(quote.total)}</dd></div>
            </dl>
          </>
        )}
        {error && <p role="alert" className="mt-3 text-[14px] text-danger">{error}</p>}
        <button type="submit" form="checkout" disabled={busy || !quote} className="btn mt-6 w-full">
          Continue to payment
        </button>
      </aside>
    </div>
  );
}
