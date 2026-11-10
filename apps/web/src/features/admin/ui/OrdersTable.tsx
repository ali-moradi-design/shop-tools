'use client';

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import Link from 'next/link';
import { orderNumber, type OrderStatus } from '@/entities/order';
import { formatMoney } from '@/shared/lib/money';
import { DataTable } from './DataTable';
import { OrderStatusSelect } from './OrderStatusSelect';

export interface OrderRow {
  id: string;
  createdAt: string;
  customer: string;
  items: number;
  total: number;
  status: OrderStatus;
}

const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, OrderRow>();
const columns = helper.columns([
  helper.accessor('id', {
    header: 'Order',
    cell: ({ getValue }) => <Link prefetch={false} className="link-underline font-mono" href={`/admin/orders/${getValue()}`}>{orderNumber(getValue())}</Link>,
  }),
  helper.accessor('createdAt', { header: 'Date', cell: ({ getValue }) => <span className="whitespace-nowrap">{date.format(new Date(getValue()))}</span> }),
  helper.accessor('customer', { header: 'Customer' }),
  helper.accessor('items', { header: 'Items' }),
  helper.accessor('total', { header: 'Total', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue())}</span> }),
  helper.accessor('status', {
    header: 'Status',
    cell: ({ row }) => <OrderStatusSelect orderId={row.original.id} status={row.original.status} />,
  }),
]);

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const table = useTable({ features, columns, data: rows, getRowId: (r) => r.id });
  return <DataTable table={table} label="Orders" empty="No orders match." rowTestId="admin-order" />;
}
