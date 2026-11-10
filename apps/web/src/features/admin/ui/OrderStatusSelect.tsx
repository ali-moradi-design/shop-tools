'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CARRIERS, NEXT_STATUS, STATUS_LABEL, type OrderStatus } from '@/entities/order';
import { updateOrderStatus, type Shipment } from '../api/actions';
import type { ActionResult } from '../model/action-result';
import { ActionMessage } from './ActionMessage';
import { useAction } from './useAction';

const CANCEL_CONFIRM = 'Cancel this order? Its items go back into stock, and a Stripe payment is refunded.';

/** Moves an order to one of its allowed next statuses (a select in the list, a form with a note on the order page). */
export function OrderStatusSelect({ orderId, status, withNote = false }: { orderId: string; status: OrderStatus; withNote?: boolean }) {
  const router = useRouter();
  const { pending, result, run } = useAction();
  const options = NEXT_STATUS[status];
  if (options.length === 0) return <span>{STATUS_LABEL[status]}</span>;

  const change = (next: OrderStatus, note?: string, shipment?: Shipment) => {
    if (next === 'cancelled' && !window.confirm(CANCEL_CONFIRM)) return false;
    // shipping needs the carrier and tracking number: the order page asks for them
    if (next === 'shipped' && !shipment) {
      router.push(`/admin/orders/${orderId}#change-status`);
      return false;
    }
    run(() => updateOrderStatus(orderId, next, note, shipment));
    return true;
  };

  // keyed by status: after a change the next steps differ, so the form starts over;
  // the result message lives here, so it stays on screen
  if (withNote) return <StatusForm key={status} options={options} pending={pending} result={result} onChange={change} />;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <select
        aria-label="Order status"
        value=""
        disabled={pending}
        className="border border-line bg-paper px-2 py-1"
        onChange={(e) => change(e.target.value as OrderStatus)}
      >
        <option value="" disabled>{STATUS_LABEL[status]}</option>
        {options.map((s) => <option key={s} value={s}>→ {STATUS_LABEL[s]}</option>)}
      </select>
      {result?.status === 'error' && <ActionMessage result={result} />}
    </span>
  );
}

/** Order page: next status plus an optional note for the history. */
function StatusForm({
  options,
  pending,
  result,
  onChange,
}: {
  options: OrderStatus[];
  pending: boolean;
  result: ActionResult | null;
  onChange: (status: OrderStatus, note?: string, shipment?: Shipment) => boolean;
}) {
  const [next, setNext] = useState<OrderStatus>(options[0]);
  const [note, setNote] = useState('');
  const [carrier, setCarrier] = useState<Shipment['carrier']>('DHL');
  const [tracking, setTracking] = useState('');
  const [trackingError, setTrackingError] = useState(false);
  const tooLong = note.trim().length > 500;
  const shipping = next === 'shipped';
  return (
    <form
      noValidate
      className="flex flex-wrap items-end gap-2 text-[14px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (tooLong) return;
        if (shipping && tracking.trim().length < 4) return setTrackingError(true);
        setTrackingError(false);
        if (onChange(next, note.trim() || undefined, shipping ? { carrier, trackingNumber: tracking.trim() } : undefined)) {
          setNote('');
          setTracking('');
        }
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-mute">Move to</span>
        <select value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} className="border-2 border-ink bg-paper px-2 py-2">
          {options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </label>
      {shipping && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-mute">Carrier</span>
            <select value={carrier} onChange={(e) => setCarrier(e.target.value as Shipment['carrier'])} className="border-2 border-ink bg-paper px-2 py-2">
              {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex min-w-[180px] flex-col gap-1">
            <span className="text-mute">Tracking number</span>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} aria-invalid={trackingError || undefined} maxLength={40} className="field font-mono" />
            {trackingError && <span className="text-[12px] text-danger">Enter the tracking number</span>}
          </label>
        </>
      )}
      <label className="flex min-w-[200px] flex-1 flex-col gap-1">
        <span className="text-mute">Note for the history (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={tooLong || undefined} placeholder="Reason, message for the history…" className="field" />
        {tooLong && <span className="text-[12px] text-danger">Up to 500 characters</span>}
      </label>
      <button type="submit" disabled={pending} className="btn">{pending ? 'Saving…' : 'Update'}</button>
      <ActionMessage result={result} className="w-full" />
    </form>
  );
}
