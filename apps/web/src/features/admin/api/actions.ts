'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Product } from '@/entities/product';
import { ApiError } from '@/shared/api';
import { serverApi, serverMutate } from '@/shared/api/server';
import type { ActionResult } from '../model/action-result';

/*
 * Admin writes. Each action calls the API with the visitor's own cookies, and the
 * API checks the admin permission, so these are safe to expose: a customer (or a
 * forged POST) gets a 403 and nothing changes. Every page renders per request (SSR),
 * so refresh() is all it takes for the admin page to show the new data in the same
 * round trip; shoppers see the change on their next request.
 */

/** API errors become a message; an expired session goes to sign-in. */
function failure(err: unknown, from: string): ActionResult {
  if (err instanceof ApiError && err.status === 401) redirect(`/account/login?next=${encodeURIComponent(from)}`);
  return { status: 'error', message: err instanceof Error ? err.message : 'Something went wrong' };
}

const productPath = (id: string) => `/products/${encodeURIComponent(id)}`;

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await serverMutate(productPath(id), 'DELETE');
  } catch (err) {
    return failure(err, '/admin/products');
  }
  refresh();
  return { status: 'ok', message: 'Moved to the trash.' };
}

export async function restoreProduct(id: string): Promise<ActionResult> {
  let product: Product;
  try {
    product = (await serverMutate<{ data: Product }>(`${productPath(id)}/restore`, 'POST')).data;
  } catch (err) {
    return failure(err, '/admin/products/trash');
  }
  refresh();
  return { status: 'ok', message: `${product.title} is back in the shop.` };
}

export type BulkAction =
  | { kind: 'delete' }
  | { kind: 'feature'; on: boolean }
  | { kind: 'discount'; percent: number }
  | { kind: 'end-sale' };

const BULK_MAX = 100;

/** One change applied to several products; reports how many succeeded. */
export async function bulkUpdateProducts(ids: string[], action: BulkAction): Promise<ActionResult> {
  if (ids.length === 0 || ids.length > BULK_MAX) return { status: 'error', message: `Select between 1 and ${BULK_MAX} products.` };
  if (action.kind === 'discount' && !(Number.isInteger(action.percent) && action.percent > 0 && action.percent < 100)) {
    return { status: 'error', message: 'Enter a whole discount between 1 and 99 percent.' };
  }
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const path = productPath(id);
      if (action.kind === 'delete') return serverMutate(path, 'DELETE');
      if (action.kind === 'feature') return serverMutate(path, 'PATCH', { featured: action.on });
      const { data: p } = await serverApi<{ data: Product }>(path);
      if (action.kind === 'end-sale') {
        if (!p.compareAtPrice) return;
        return serverMutate(path, 'PATCH', { price: p.compareAtPrice, compareAtPrice: null });
      }
      // a new sale starts from the regular price, not from an earlier sale price
      const original = p.compareAtPrice ?? p.price;
      return serverMutate(path, 'PATCH', {
        price: Math.round((original * (100 - action.percent)) / 100),
        compareAtPrice: original,
      });
    }),
  );
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.some((r) => r.reason instanceof ApiError && r.reason.status === 401)) {
    redirect('/account/login?next=/admin/products');
  }
  refresh();
  const done = results.length - failed.length;
  if (failed.length) return { status: 'error', message: `${done} updated, ${failed.length} failed.` };
  return { status: 'ok', message: `${done} ${done === 1 ? 'product' : 'products'} updated.` };
}
