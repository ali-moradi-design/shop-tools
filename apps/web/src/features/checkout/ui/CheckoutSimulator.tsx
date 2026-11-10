'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { clientApi } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/money';
import { cardSchema, type CardValues } from '../model/card';

export interface SimulatedSession {
  id: string;
  amount: number;
  currency: string;
  cancelUrl: string;
  lines: { title: string; unitAmount: number; quantity: number; image?: string }[];
}

const TEST_CARDS = [
  ['4242 4242 4242 4242', 'Pays'],
  ['4000 0000 0000 0002', 'Declined'],
  ['4000 0000 0000 9995', 'Insufficient funds'],
] as const;

/**
 * Stand-in for Stripe's hosted Checkout page, used when the API has no Stripe
 * key. Paying here makes the API send itself the signed webhook Stripe would,
 * then the browser returns to the shop exactly like after Stripe Checkout.
 */
export function CheckoutSimulator({ session }: { session: SimulatedSession }) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { card: '4242 4242 4242 4242', expiry: '12 / 30', cvc: '123' },
  });

  const pay = handleSubmit(async (values) => {
    setError(null);
    try {
      const { data } = await clientApi<{ data: { redirectUrl: string } }>(
        `/payments/simulator/sessions/${encodeURIComponent(session.id)}/pay`,
        { method: 'POST', body: JSON.stringify(values) },
      );
      window.location.assign(data.redirectUrl);
      // keep the button busy while the browser leaves
      await new Promise(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  });

  const field =
    'mt-1 block w-full rounded-md border border-[#d0d5dd] px-3 py-2.5 shadow-[0_1px_1px_rgba(0,0,0,0.03)] outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/25 aria-[invalid=true]:border-danger';
  const fieldError = (name: keyof CardValues) =>
    errors[name] && <span className="mt-1 block text-[12px] text-danger">{errors[name]?.message}</span>;

  return (
    <div className="min-h-[80vh] bg-white font-sans text-[#1a1f36]">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-2 md:gap-16 md:py-16">
        <section aria-label="Order summary">
          <a href={session.cancelUrl} className="inline-flex items-center gap-2 text-[14px] text-[#5b6476] hover:text-[#1a1f36]">
            <span aria-hidden>←</span> Toolbench Supply Co.
            <span className="rounded bg-[#ffde92] px-1.5 py-0.5 text-[11px] font-semibold uppercase text-[#7a2c04]">Test mode</span>
          </a>
          <p className="mt-6 text-[16px] text-[#5b6476]">Pay Toolbench Supply Co.</p>
          <p className="text-[36px] font-semibold tracking-tight" data-testid="pay-amount">{formatMoney(session.amount)}</p>
          <ul className="mt-6 space-y-4">
            {session.lines.map((l) => (
              <li key={l.title} className="flex items-center gap-3 text-[14px]">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#e3e8ee] bg-[#f6f8fa]">
                  {l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-contain" />}
                </span>
                <span className="flex-1">
                  {l.title}
                  {l.quantity > 1 && <span className="block text-[12px] text-[#5b6476]">Qty {l.quantity}</span>}
                </span>
                <span>{formatMoney(l.unitAmount * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex justify-between border-t border-[#e3e8ee] pt-4 text-[14px] font-semibold">
            <span>Total due</span>
            <span>{formatMoney(session.amount)}</span>
          </p>
        </section>

        <section aria-label="Payment">
          <h1 className="text-[20px] font-semibold">Pay with card</h1>
          <form className="mt-5 space-y-4 text-[14px]" onSubmit={pay} noValidate>
            <label className="block">
              Card number
              <input {...register('card')} aria-invalid={errors.card ? true : undefined} inputMode="numeric" autoComplete="cc-number" className={field} />
              {fieldError('card')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                Expiry
                <input {...register('expiry')} aria-invalid={errors.expiry ? true : undefined} autoComplete="cc-exp" className={field} />
                {fieldError('expiry')}
              </label>
              <label className="block">
                CVC
                <input {...register('cvc')} aria-invalid={errors.cvc ? true : undefined} inputMode="numeric" autoComplete="cc-csc" className={field} />
                {fieldError('cvc')}
              </label>
            </div>
            {error && <p role="alert" className="text-danger">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-[#635bff] px-4 py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-[#5249e0] disabled:opacity-60"
            >
              {isSubmitting ? 'Processing…' : `Pay ${formatMoney(session.amount)}`}
            </button>
          </form>

          <div className="mt-6 rounded-md bg-[#f6f8fa] p-4 text-[13px] text-[#5b6476]">
            <p className="font-medium text-[#1a1f36]">Stripe test cards</p>
            <ul className="mt-2 space-y-1">
              {TEST_CARDS.map(([number, result]) => (
                <li key={number} className="flex justify-between gap-3">
                  <button type="button" className="font-mono underline-offset-2 hover:underline" onClick={() => setValue('card', number)}>
                    {number}
                  </button>
                  <span>{result}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Simulated Stripe Checkout: no Stripe account or real money. Paying sends a signed{' '}
              <code>checkout.session.completed</code> webhook to the shop, which then confirms the order.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
