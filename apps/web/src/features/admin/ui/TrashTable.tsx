'use client';

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import Image from 'next/image';
import { restoreProduct } from '../api/actions';
import { ActionMessage } from './ActionMessage';
import { DataTable } from './DataTable';
import { useAction } from './useAction';

export interface TrashRow {
  id: string;
  title: string;
  image?: string;
  stock: number;
}

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, TrashRow>();
const columns = helper.columns([
  helper.accessor('title', {
    header: 'Product',
    cell: ({ row }) => (
      <span className="flex items-center gap-3">
        <span className="relative h-12 w-12 shrink-0 bg-paper">
          {row.original.image && <Image src={row.original.image} alt="" fill sizes="48px" className="object-contain" />}
        </span>
        {row.original.title}
      </span>
    ),
  }),
  helper.accessor('stock', { header: 'Stock' }),
  helper.display({
    id: 'restore',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => <Restore id={row.original.id} {...(table.options.meta as RestoreMeta)} />,
  }),
]);

interface RestoreMeta {
  pending: boolean;
  onRestore: (id: string) => void;
}

/**
 * The result shows above the table: a restored product leaves this list, so a
 * message inside its row would vanish with it.
 */
export function TrashTable({ rows }: { rows: TrashRow[] }) {
  const { pending, result, run } = useAction();
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (r) => r.id,
    meta: { pending, onRestore: (id: string) => run(() => restoreProduct(id)) } satisfies RestoreMeta,
  });
  return (
    <>
      <ActionMessage result={result} className="mb-3" />
      <DataTable table={table} label="Deleted products" empty="The trash is empty." />
    </>
  );
}

function Restore({ id, pending, onRestore }: { id: string } & RestoreMeta) {
  return (
    <span className="flex justify-end">
      <button type="button" disabled={pending} onClick={() => onRestore(id)} className="link-underline text-[13px]">
        Restore
      </button>
    </span>
  );
}
