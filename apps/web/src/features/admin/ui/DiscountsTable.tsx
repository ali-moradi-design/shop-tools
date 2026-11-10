'use client';

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import type { Discount } from '@/entities/discount';
import { formatMoney } from '@/shared/lib/money';
import { deleteDiscount, setDiscountActive } from '../api/actions';
import { ActionMessage } from './ActionMessage';
import { DataTable } from './DataTable';
import { useAction } from './useAction';

/** A code plus what a shopper would get with it right now. */
export type DiscountRow = Discount & { state: 'Active' | 'Paused' | 'Expired' | 'Used up' };

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, DiscountRow>();
const columns = helper.columns([
  helper.accessor('code', { header: 'Code', cell: ({ getValue }) => <span className="font-mono font-semibold tracking-wider text-ink">{getValue()}</span> }),
  helper.accessor('value', {
    header: 'Discount',
    cell: ({ row: { original: d } }) => (
      <span>
        {d.type === 'percent' ? `${d.value}% off` : `${formatMoney(d.value)} off`}
        {d.minOrderAmount ? <span className="block text-[12px] text-mute">over {formatMoney(d.minOrderAmount)}</span> : null}
      </span>
    ),
  }),
  helper.accessor('usedCount', { header: 'Used', cell: ({ row: { original: d } }) => `${d.usedCount}${d.maxUses !== undefined ? ` / ${d.maxUses}` : ''}` }),
  helper.accessor('endsAt', { header: 'Ends', cell: ({ getValue }) => (getValue() ? day.format(new Date(getValue()!)) : '—') }),
  helper.accessor('state', { header: 'State' }),
  helper.display({ id: 'actions', header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <Actions discount={row.original} /> }),
]);

export function DiscountsTable({ rows }: { rows: DiscountRow[] }) {
  const table = useTable({ features, columns, data: rows, getRowId: (r) => r.id });
  return <DataTable table={table} label="Discount codes" empty="No discount codes yet." />;
}

function Actions({ discount }: { discount: Discount }) {
  const { pending, result, run } = useAction();
  return (
    <span className="flex items-center justify-end gap-3 whitespace-nowrap text-[13px]">
      {result?.status === 'error' && <ActionMessage result={result} />}
      <button type="button" disabled={pending} className="link-underline" onClick={() => run(() => setDiscountActive(discount.id, !discount.isActive))}>
        {discount.isActive ? 'Pause' : 'Activate'}
      </button>
      <button
        type="button"
        disabled={pending}
        className="text-danger hover:underline"
        onClick={() => window.confirm(`Delete ${discount.code}? Shoppers can no longer use it.`) && run(() => deleteDiscount(discount.id))}
      >
        Delete
      </button>
    </span>
  );
}
