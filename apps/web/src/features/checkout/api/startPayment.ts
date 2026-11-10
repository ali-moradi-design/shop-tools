'use client';

import { clientApi } from '@/shared/api/client';

/**
 * Opens Stripe Checkout for an order (or the local simulator when the API has
 * no Stripe key). A full page load, since Stripe's page is on another site.
 */
export async function startPayment(orderId: string): Promise<void> {
  const { data } = await clientApi<{ data: { url: string } }>(`/orders/${encodeURIComponent(orderId)}/checkout`, {
    method: 'POST',
  });
  window.location.assign(data.url);
}
