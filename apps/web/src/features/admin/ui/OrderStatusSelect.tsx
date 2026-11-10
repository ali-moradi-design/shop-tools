'use client';

import { useState } from 'react';
import { NEXT_STATUS, STATUS_LABEL, type OrderStatus } from '@/entities/order';
import { updateOrderStatus } from '../api/actions';
import type { ActionResult } from '../model/action-result';
import { ActionMessage } from './ActionMessage';
import { useAction } from './useAction';

const CANCEL_CONFIRM = 'Cancel this order? Its items go back into stock.';

/** Moves an order to one of its allowed next statuses (a select in the list, a form with a note on the order page). */
export function OrderStatusSelect({ orderId, status, withNote = false }: { orderId: string; status: OrderStatus; withNote?: boolean }) {
  const { pending, result, run } = useAction();
  const options = NEXT_STATUS[status];
  if (options.length === 0) return <span>{STATUS_LABEL[status]}</span>;

  const change = (next: OrderStatus, note?: string) => {
    if (next === 'cancelled' && !window.confirm(CANCEL_CONFIRM)) return false;
    run(() => updateOrderStatus(orderId, next, note));
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
  onChange: (status: OrderStatus, note?: string) => boolean;
}) {
  const [next, setNext] = useState<OrderStatus>(options[0]);
  const [note, setNote] = useState('');
  const tooLong = note.trim().length > 500;
  return (
    <form
      noValidate
      className="flex flex-wrap items-end gap-2 text-[14px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!tooLong && onChange(next, note.trim() || undefined)) setNote('');
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-mute">Move to</span>
        <select value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} className="border-2 border-ink bg-paper px-2 py-2">
          {options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </label>
      <label className="flex min-w-[200px] flex-1 flex-col gap-1">
        <span className="text-mute">Note for the history (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={tooLong || undefined} placeholder="Reason, tracking number…" className="field" />
        {tooLong && <span className="text-[12px] text-danger">Up to 500 characters</span>}
      </label>
      <button type="submit" disabled={pending} className="btn">{pending ? 'Saving…' : 'Update'}</button>
      <ActionMessage result={result} className="w-full" />
    </form>
  );
}
