'use client';

import type { ReactNode } from 'react';

/** Header button for a column sorted in the browser by TanStack Table. */
export function SortButton({ sorted, onClick, children }: { sorted: false | 'asc' | 'desc'; onClick?: (e: unknown) => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 uppercase tracking-[0.16em] hover:text-ink">
      {children}
      <span aria-hidden className={sorted ? 'text-ink' : 'opacity-30'}>{sorted === 'desc' ? '↓' : '↑'}</span>
      <span className="sr-only">{sorted ? `, sorted ${sorted === 'asc' ? 'ascending' : 'descending'}` : ', sort'}</span>
    </button>
  );
}
