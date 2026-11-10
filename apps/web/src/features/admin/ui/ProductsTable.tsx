'use client';

import {
  createColumnHelper,
  rowSelectionFeature,
  tableFeatures,
  useTable,
  type RowSelectionState,
} from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';
import { bulkUpdateProducts, deleteProduct, type BulkAction } from '../api/actions';
import { ActionMessage } from './ActionMessage';
import { DataTable } from './DataTable';
import { SortHeader } from './SortHeader';
import { useAction } from './useAction';

/** The fields the list needs; the page sends only these to the browser. */
export interface ProductRow {
  id: string;
  slug: string;
  title: string;
  sku?: string;
  image?: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  /** Units per warehouse code, in dispatch order. */
  warehouses: { warehouse: string; quantity: number }[];
  featured: boolean;
}

const LOW = 5;

const features = tableFeatures({ rowSelectionFeature });
const helper = createColumnHelper<typeof features, ProductRow>();

const columns = helper.columns([
  helper.display({
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        aria-label="Select all on this page"
        checked={table.getIsAllRowsSelected()}
        ref={(el) => {
          if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
        }}
        onChange={table.getToggleAllRowsSelectedHandler()}
        className="h-4 w-4 accent-ink"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label={`Select ${row.original.title}`}
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="h-4 w-4 accent-ink"
      />
    ),
  }),
  helper.accessor('title', {
    header: () => <SortHeader field="title" label="Product" isDefault />,
    cell: ({ row }) => (
      <span className="flex items-center gap-3">
        <span className="relative h-12 w-12 shrink-0 bg-paper">
          {row.original.image && <Image src={row.original.image} alt="" fill sizes="48px" className="object-contain" />}
        </span>
        <span>
          <Link prefetch={false} href={`/admin/products/${row.original.id}`} className="text-ink hover:underline">{row.original.title}</Link>
          {row.original.featured && <span className="tag tag-accent ml-2">Featured</span>}
          {row.original.sku && <span className="block font-mono text-[11px] text-mute">{row.original.sku}</span>}
        </span>
      </span>
    ),
  }),
  helper.accessor('category', { header: 'Category' }),
  helper.accessor('price', {
    header: () => <SortHeader field="price" label="Price" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-mono">
        {row.original.compareAtPrice && <s className="mr-1.5 text-mute">{formatMoney(row.original.compareAtPrice)}</s>}
        {formatMoney(row.original.price)}
      </span>
    ),
  }),
  helper.accessor('stock', {
    header: () => <SortHeader field="stock" label="Stock" />,
    cell: ({ row }) => {
      const { stock, warehouses } = row.original;
      return (
        <span className="whitespace-nowrap">
          <span className={cn('font-mono', stock === 0 ? 'font-semibold text-danger' : stock <= LOW && 'text-danger')}>
            {stock === 0 ? 'Sold out' : stock}
          </span>
          <span className="ml-2 font-mono text-[11px] text-mute" title="Per warehouse">
            {warehouses.map((w) => `${w.warehouse} ${w.quantity}`).join(' · ')}
          </span>
        </span>
      );
    },
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <RowActions row={row.original} />,
  }),
]);

/** Product list with selection and bulk actions; sorting and pages come from the URL. */
export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
  });
  // a row that left the list (deleted, filtered out) cannot stay selected
  const selected = Object.keys(rowSelection).filter((id) => rows.some((r) => r.id === id));
  return (
    <>
      <BulkBar ids={selected} onDone={() => setRowSelection({})} />
      <DataTable table={table} label="Products" empty="No products match these filters." rowTestId="admin-product" />
    </>
  );
}

function BulkBar({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { pending, result, run } = useAction();
  const [percent, setPercent] = useState('20');
  const apply = (action: BulkAction, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    run(() => bulkUpdateProducts(ids, action), (r) => r.status === 'ok' && onDone());
  };
  if (ids.length === 0) return <ActionMessage result={result} className="mb-3" />;
  const button = 'underline underline-offset-4 disabled:opacity-40';
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-2 border-ink bg-accent px-4 py-3 text-[13px] text-accent-ink" role="region" aria-label="Bulk actions">
      <strong>{ids.length} selected</strong>
      <button type="button" disabled={pending} onClick={() => apply({ kind: 'feature', on: true })} className={button}>Feature</button>
      <button type="button" disabled={pending} onClick={() => apply({ kind: 'feature', on: false })} className={button}>Unfeature</button>
      <span className="flex items-center gap-1" title="Changes the base price; options with their own price keep it">
        <label htmlFor="bulk-percent">Sale</label>
        <input id="bulk-percent" value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="numeric" className="w-12 border border-ink bg-paper px-1.5 py-0.5 font-mono" />%
        <button type="button" disabled={pending} onClick={() => apply({ kind: 'discount', percent: Number(percent) })} className={button}>Apply</button>
      </span>
      <button type="button" disabled={pending} onClick={() => apply({ kind: 'end-sale' })} className={button}>End sale</button>
      <button type="button" disabled={pending} onClick={() => apply({ kind: 'delete' }, `Move ${ids.length} products to the trash?`)} className={cn(button, 'font-semibold')}>
        Move to trash
      </button>
      {pending && <span>Working…</span>}
      <ActionMessage result={result} />
    </div>
  );
}

function RowActions({ row }: { row: ProductRow }) {
  const { pending, result, run } = useAction();
  return (
    <span className="flex items-center justify-end gap-3 whitespace-nowrap text-[13px]">
      <Link prefetch={false} href={`/admin/products/${row.id}`} className="link-underline">Edit</Link>
      <Link prefetch={false} href={`/products/${row.slug}`} className="text-mute hover:text-ink" target="_blank">View</Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => window.confirm(`Move “${row.title}” to the trash?`) && run(() => deleteProduct(row.id))}
        className="text-danger hover:underline"
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {result?.status === 'error' && <ActionMessage result={result} />}
    </span>
  );
}
