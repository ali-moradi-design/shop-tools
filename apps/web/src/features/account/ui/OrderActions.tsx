'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { RETURN_REASONS } from '@/entities/order';
import { clientApi } from '@/shared/api/client';
import { formatMoney } from '@/shared/lib/money';

/** Cancels an order that has not shipped; a paid order is refunded through Stripe. */
export function CancelOrderButton({ orderId, paid }: { orderId: string; paid: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className="text-[14px] text-danger underline underline-offset-4"
        onClick={async () => {
          if (!window.confirm(paid ? 'Cancel this order? We will refund your payment.' : 'Cancel this order?')) return;
          setBusy(true);
          setError(null);
          try {
            await clientApi(`/orders/${orderId}/cancel`, { method: 'POST', body: '{}' });
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not cancel');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Cancelling…' : 'Cancel order'}
      </button>
      {error && <p role="alert" className="mt-2 text-[14px] text-danger">{error}</p>}
    </div>
  );
}

export interface ReturnableLine {
  title: string;
  label: string;
  /** Units not already in a return. */
  available: number;
  price: number;
}

interface ReturnValues {
  reason: (typeof RETURN_REASONS)[number][0];
  comment: string;
  /** Keyed by the line's position in the order, not by SKU (SKUs may contain dots). */
  lines: Record<string, string>;
}

/** Return request, one row per line of the order. */
export function ReturnRequestForm({ orderId, lines }: { orderId: string; lines: ReturnableLine[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ReturnValues>({
    defaultValues: { reason: 'damaged', comment: '', lines: Object.fromEntries(lines.map((_, i) => [`r${i}`, '0'])) },
  });
  const submit = handleSubmit(async (v) => {
    setError(null);
    const items = lines.map((_, i) => ({ line: i, quantity: Number(v.lines[`r${i}`]) })).filter((i) => i.quantity > 0);
    if (items.length === 0) return setError('Choose at least one item to send back.');
    try {
      await clientApi('/returns', { method: 'POST', body: JSON.stringify({ orderId, reason: v.reason, ...(v.comment.trim() ? { comment: v.comment.trim() } : {}), items }) });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request');
    }
  });

  if (lines.every((l) => l.available === 0)) return null;
  if (!open) {
    return (
      <button type="button" className="btn btn-outline mt-8" onClick={() => setOpen(true)}>
        Return items
      </button>
    );
  }
  const select = 'mt-1 block border-2 border-ink bg-paper px-2 py-2';
  return (
    <form onSubmit={submit} noValidate className="panel mt-8 space-y-5 p-5 text-[14px]" aria-labelledby="return-heading">
      <h2 id="return-heading" className="heading text-[22px]">Return items</h2>
      <p className="text-mute">Free within 30 days of shipping. We refund you once the items are back at our warehouse.</p>
      <ul className="space-y-4">
        {lines.map((l, i) => (
          <li key={i} className="grid gap-3 border-b border-line-soft pb-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p>{l.title}</p>
              <p className="text-mute">{l.label} · {formatMoney(l.price)}{l.available === 0 ? ' · already returned' : ''}</p>
            </div>
            <label className="block">
              How many
              <select {...register(`lines.r${i}`)} disabled={l.available === 0} className={select}>
                {Array.from({ length: l.available + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <label className="block">
        Reason
        <select {...register('reason')} className={`${select} w-full`}>
          {RETURN_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block">
        Anything we should know? (optional)
        <textarea {...register('comment')} rows={3} maxLength={1000} className="mt-1 field" />
      </label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={formState.isSubmitting} className="btn">Send request</button>
        <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
