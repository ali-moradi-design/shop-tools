'use client';

import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import { useCompare } from '../model/CompareProvider';
import type { CompareItem } from '../model/CompareProvider';

/** The "Compare" checkbox on a product card or product page. */
export function CompareToggle({ item, className }: { item: CompareItem; className?: string }) {
  const { has, toggle } = useCompare();
  const on = has(item.slug);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={`Compare ${item.title}`}
      onClick={() => toggle(item)}
      className={cn('flex items-center gap-1.5 font-mono text-[12px]', className)}
      data-testid="compare-toggle"
    >
      <span className={cn('grid h-3.5 w-3.5 place-items-center border-2 border-ink text-[9px] font-bold leading-none', on ? 'bg-accent' : 'bg-white')}>
        {on ? '✓' : ''}
      </span>
      Compare
    </button>
  );
}

/** Header link with the number of tools in the tray. */
export function CompareLink() {
  const { items, href } = useCompare();
  return (
    <Link href={items.length >= 2 ? href : '/compare'} className="flex items-center gap-1.5">
      <span className="hidden sm:inline">Compare</span>
      <span className="sm:hidden" aria-hidden>⇄</span>
      <span className="bg-accent px-1.5 font-mono text-[11px] font-semibold text-accent-ink" data-testid="compare-count" aria-label={`${items.length} in compare`}>
        {items.length}
      </span>
    </Link>
  );
}
