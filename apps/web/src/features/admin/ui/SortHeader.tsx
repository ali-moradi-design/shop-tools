'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Column header that sorts on the server: a link that sets ?sort and ?order
 * (and returns to page 1), so sorting works across all pages, not just this one.
 */
export function SortHeader({
  field,
  label,
  firstOrder = 'asc',
  isDefault = false,
}: {
  field: string;
  label: string;
  firstOrder?: 'asc' | 'desc';
  /** The list is sorted by this field when the URL names none. */
  isDefault?: boolean;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get('sort') === field || (isDefault && !params.get('sort'));
  const order = active ? params.get('order') ?? 'asc' : null;
  const next = new URLSearchParams(params);
  next.set('sort', field);
  next.set('order', active ? (order === 'asc' ? 'desc' : 'asc') : firstOrder);
  next.delete('page');
  return (
    <Link
      href={`${pathname}?${next}`}
      scroll={false}
      className="inline-flex items-center gap-1 hover:text-ink"
      aria-label={`Sort by ${label}${active ? `, now ${order === 'asc' ? 'ascending' : 'descending'}` : ''}`}
    >
      {label}
      <span aria-hidden className={active ? 'text-ink' : 'opacity-30'}>{order === 'desc' ? '↓' : '↑'}</span>
    </Link>
  );
}
