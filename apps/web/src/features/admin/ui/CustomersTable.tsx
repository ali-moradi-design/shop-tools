'use client';

import {
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  columnFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { setUserActive, setUserRoles } from '../api/actions';
import { ActionMessage } from './ActionMessage';
import { DataTable } from './DataTable';
import { SortButton } from './SortButton';
import { useAction } from './useAction';

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  joined: string;
  /** Role ids, for changing the admin role. */
  roleIds: string[];
}

interface Meta {
  meId: string;
  adminRoleId?: string;
}

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

/** The list is short (no paging in the API), so search, sorting and pages run in the browser. */
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});
const helper = createColumnHelper<typeof features, CustomerRow>();
const columns = helper.columns([
  helper.accessor('name', {
    header: ({ column }) => <SortButton sorted={column.getIsSorted()} onClick={column.getToggleSortingHandler()}>Name</SortButton>,
    sortFn: 'alphanumeric',
    cell: ({ row }) => (
      <span>
        <span className="text-ink">{row.original.name}</span>
        {row.original.isAdmin && <span className="tag tag-accent ml-2">Admin</span>}
      </span>
    ),
  }),
  helper.accessor('email', {
    header: ({ column }) => <SortButton sorted={column.getIsSorted()} onClick={column.getToggleSortingHandler()}>Email</SortButton>,
    sortFn: 'alphanumeric',
  }),
  helper.accessor('joined', {
    header: ({ column }) => <SortButton sorted={column.getIsSorted()} onClick={column.getToggleSortingHandler()}>Joined</SortButton>,
    sortFn: 'basic',
    enableGlobalFilter: false,
    cell: ({ getValue }) => day.format(new Date(getValue())),
  }),
  helper.accessor('isActive', {
    header: 'Status',
    enableGlobalFilter: false,
    cell: ({ getValue }) => <span className={cn(!getValue() && 'text-danger')}>{getValue() ? 'Active' : 'Blocked'}</span>,
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => <Actions user={row.original} meta={table.options.meta as Meta} />,
  }),
]);

export function CustomersTable({ rows, meId, adminRoleId }: { rows: CustomerRow[] } & Meta) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'joined', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (r) => r.id,
    globalFilterFn: 'includesString',
    state: { globalFilter, sorting, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    meta: { meId, adminRoleId } satisfies Meta,
  });
  const matches = table.getFilteredRowModel().rows.length;
  return (
    <>
      <div className="mb-4 flex max-w-md">
        <label htmlFor="customer-q" className="sr-only">Search customers</label>
        <input
          id="customer-q"
          type="search"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            table.setPageIndex(0);
          }}
          placeholder="Name or email"
          className="field"
        />
      </div>
      <DataTable table={table} label="Customers" empty="No customers match." rowTestId="admin-customer" />
      <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center gap-6 text-[14px]">
        {table.getCanPreviousPage() && <button type="button" className="link-underline" onClick={() => table.previousPage()}>← Previous</button>}
        <span className="text-mute">Page {pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} · {matches} {matches === 1 ? 'person' : 'people'}</span>
        {table.getCanNextPage() && <button type="button" className="link-underline" onClick={() => table.nextPage()}>Next →</button>}
      </nav>
    </>
  );
}

function Actions({ user, meta }: { user: CustomerRow; meta: Meta }) {
  const { pending, result, run } = useAction();
  if (user.id === meta.meId) return <span className="block text-right text-[13px] text-mute">You</span>;
  const toggleAdmin = () => {
    if (!meta.adminRoleId) return;
    const roles = user.isAdmin ? user.roleIds.filter((r) => r !== meta.adminRoleId) : [...user.roleIds, meta.adminRoleId];
    if (!window.confirm(user.isAdmin ? `Remove admin access from ${user.name}?` : `Give ${user.name} full admin access?`)) return;
    run(() => setUserRoles(user.id, roles));
  };
  return (
    <span className="flex items-center justify-end gap-3 whitespace-nowrap text-[13px]">
      {result?.status === 'error' && <ActionMessage result={result} />}
      <button type="button" disabled={pending || !meta.adminRoleId} className="link-underline" onClick={toggleAdmin}>
        {user.isAdmin ? 'Remove admin' : 'Make admin'}
      </button>
      <button
        type="button"
        disabled={pending}
        className={cn('hover:underline', user.isActive && 'text-danger')}
        onClick={() => (!user.isActive || window.confirm(`Block ${user.name}? They can no longer sign in.`)) && run(() => setUserActive(user.id, !user.isActive))}
      >
        {user.isActive ? 'Block' : 'Unblock'}
      </button>
    </span>
  );
}
