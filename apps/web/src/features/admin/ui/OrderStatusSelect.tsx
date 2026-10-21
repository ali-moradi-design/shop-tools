'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { STATUS_LABEL, type OrderStatus } from '@/entities/order';
import { clientApi } from '@/shared/api/client';

/** Mirrors the API's allowed transitions (order.transitions.ts). */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
  failed: [],
};

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const options = NEXT[status];
  if (options.length === 0) return <span>{STATUS_LABEL[status]}</span>;
  return (
    <span>
      <select
        aria-label="Order status"
        defaultValue=""
        className="border border-line bg-white px-2 py-1"
        onChange={async (e) => {
          setError(null);
          try {
            await clientApi(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed');
          }
        }}
      >
        <option value="" disabled>{STATUS_LABEL[status]}</option>
        {options.map((s) => (
          <option key={s} value={s}>→ {STATUS_LABEL[s]}</option>
        ))}
      </select>
      {error && <span role="alert" className="ml-2 text-danger">{error}</span>}
    </span>
  );
}
