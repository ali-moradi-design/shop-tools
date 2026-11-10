'use client';

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import Link from 'next/link';
import { Stars } from '@/shared/ui';
import { deleteReview } from '../api/actions';
import { ActionMessage } from './ActionMessage';
import { DataTable } from './DataTable';
import { useAction } from './useAction';

export interface ReviewRow {
  id: string;
  rating: number;
  comment?: string;
  author: string;
  createdAt: string;
  product?: { title: string; slug: string };
}

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, ReviewRow>();
const columns = helper.columns([
  helper.accessor('rating', { header: 'Rating', cell: ({ getValue }) => <Stars value={getValue()} /> }),
  helper.accessor('comment', {
    header: 'Review',
    cell: ({ row: { original: r } }) => (
      <span className="block max-w-[420px]">
        {r.comment ? <span className="text-ink">{r.comment}</span> : <span className="text-mute">No comment</span>}
        <span className="mt-1 block text-[12px] text-mute">{r.author} · {day.format(new Date(r.createdAt))}</span>
      </span>
    ),
  }),
  helper.accessor('product', {
    header: 'Product',
    cell: ({ getValue }) => {
      const p = getValue();
      return p ? <Link prefetch={false} href={`/products/${p.slug}#reviews`} target="_blank" className="hover:underline">{p.title}</Link> : <span className="text-mute">Deleted product</span>;
    },
  }),
  helper.display({ id: 'actions', header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <Remove review={row.original} /> }),
]);

export function ReviewsTable({ rows }: { rows: ReviewRow[] }) {
  const table = useTable({ features, columns, data: rows, getRowId: (r) => r.id });
  return <DataTable table={table} label="Reviews" empty="No reviews yet." rowTestId="admin-review" />;
}

function Remove({ review }: { review: ReviewRow }) {
  const { pending, result, run } = useAction();
  return (
    <span className="flex items-center justify-end gap-3 text-[13px]">
      {result?.status === 'error' && <ActionMessage result={result} />}
      <button
        type="button"
        disabled={pending}
        className="text-danger hover:underline"
        onClick={() => window.confirm('Remove this review? The product rating is recalculated.') && run(() => deleteReview(review.id))}
      >
        {pending ? 'Removing…' : 'Remove'}
      </button>
    </span>
  );
}
