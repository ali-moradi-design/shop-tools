'use client';

import { FlexRender, type ReactTable, type RowData, type TableFeatures } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Row links in these tables should pass prefetch={false}: a page of 30 rows would
 * otherwise prefetch every linked page as it scrolls into view.
 *
 * Markup for an admin table built with TanStack Table's useTable. The table owns
 * rows and selection; this owns the look. Scrolls sideways on small screens.
 */
export function DataTable<TFeatures extends TableFeatures, TData extends RowData>({
  table,
  empty = 'Nothing to show.',
  label,
  rowTestId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any selected state shape
  table: ReactTable<TFeatures, TData, any>;
  empty?: ReactNode;
  label: string;
  rowTestId?: string;
}) {
  const rows = table.getRowModel().rows;
  return (
    <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[640px] text-left text-[14px]" aria-label={label}>
        <thead className="border-b border-line text-[11px] uppercase tracking-[0.16em] text-mute">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} scope="col" className="py-3 pr-4 font-medium last:pr-0">
                  {header.isPlaceholder ? null : <FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={table.getAllLeafColumns().length} className="py-10 text-center text-mute">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-line" data-testid={rowTestId}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className={cn('py-2.5 pr-4 align-middle last:pr-0')}>
                    <FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
