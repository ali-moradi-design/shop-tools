'use client';

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import Link from 'next/link';
import { orderNumber, RETURN_REASONS, RETURN_STATUS_LABEL, type ReturnRequest, type ReturnStatus } from '@/entities/order';
import { formatMoney } from '@/shared/lib/money';
import { updateReturn } from '../api/actions';
import { ActionMessage } from './ActionMessage';
import { DataTable } from './DataTable';
import { useAction } from './useAction';

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const features = tableFeatures({});

const NEXT: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['refunded'],
  rejected: [],
  refunded: [],
};
const REASON: Record<string, string> = Object.fromEntries(RETURN_REASONS);
const ACTION_LABEL: Partial<Record<ReturnStatus, string>> = { approved: 'Approve', rejected: 'Reject', received: 'Mark received', refunded: 'Refund' };

const helper = createColumnHelper<typeof features, ReturnRequest>();
const columns = helper.columns([
  helper.accessor('createdAt', { header: 'Requested', cell: ({ getValue }) => <span className="whitespace-nowrap">{day.format(new Date(getValue()))}</span> }),
  helper.accessor('order', {
    header: 'Order',
    cell: ({ getValue }) => <Link prefetch={false} href={`/admin/orders/${getValue()}`} className="link-underline font-mono">{orderNumber(getValue())}</Link>,
  }),
  helper.accessor('items', {
    header: 'Items',
    cell: ({ row: { original: r } }) => (
      <span className="block max-w-[340px]">
        {r.items.map((i, n) => <span key={n} className="block">{i.quantity} × {i.title} ({i.label})</span>)}
        <span className="block text-[12px] text-mute">{REASON[r.reason] ?? r.reason}{r.comment ? ` · “${r.comment}”` : ''}</span>
      </span>
    ),
  }),
  helper.accessor('refundAmount', { header: 'Refund', cell: ({ getValue }) => <span className="font-mono">{getValue() ? formatMoney(getValue()) : '—'}</span> }),
  helper.accessor('status', { header: 'Status', cell: ({ getValue }) => RETURN_STATUS_LABEL[getValue()].split(' —')[0] }),
  helper.display({ id: 'actions', header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <ReturnActions r={row.original} /> }),
]);

export function ReturnsTable({ rows }: { rows: ReturnRequest[] }) {
  const table = useTable({ features, columns, data: rows, getRowId: (r) => r.id });
  return <DataTable table={table} label="Returns" empty="No return requests." rowTestId="admin-return" />;
}

function ReturnActions({ r }: { r: ReturnRequest }) {
  const { pending, result, run } = useAction();
  const next = NEXT[r.status];
  if (next.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center justify-end gap-3 text-[13px]">
      {next.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          className={s === 'rejected' ? 'text-danger hover:underline' : 'underline underline-offset-4'}
          onClick={() => {
            if (s === 'refunded' && !window.confirm(`Refund ${formatMoney(r.refundAmount)} to the customer?`)) return;
            const note = s === 'rejected' ? (window.prompt('Reason, for the customer (optional)') ?? undefined) : undefined;
            run(() => updateReturn(r.id, s, note || undefined));
          }}
        >
          {ACTION_LABEL[s]}
        </button>
      ))}
      {result?.status === 'error' && <ActionMessage result={result} />}
    </span>
  );
}
