'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Product } from '@/entities/product';
import { ApiError } from '@/shared/api';
import { serverApi, serverMutate } from '@/shared/api/server';
import type { Category } from '@/entities/category';
import type { ActionResult } from '../model/action-result';
import { issuesToFieldErrors, productFormSchema, toProductPayload, toSpecs, type ProductFormValues } from '../model/product-form';

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

/**
 * Creates (no id) or updates a product. The form already validated with the same
 * zod schema; it runs again here because a Server Action can be called directly.
 */
export async function saveProduct(id: string | undefined, values: ProductFormValues): Promise<ActionResult> {
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: 'Please fix the highlighted fields.', fieldErrors: issuesToFieldErrors(parsed.error) };
  }
  let saved: Product;
  try {
    const { data: category } = await serverApi<{ data: Category }>(`/categories/${encodeURIComponent(values.category)}`);
    const specErrors = toSpecs(values.specs, category.specs).errors;
    if (Object.keys(specErrors).length) return { status: 'error', message: 'Please fix the highlighted fields.', fieldErrors: specErrors };
    const data = toProductPayload(values, category.specs);
    if (id) {
      saved = (await serverMutate<{ data: Product }>(productPath(id), 'PATCH', data)).data;
    } else {
      const { compareAtPrice, ...rest } = data;
      saved = (await serverMutate<{ data: Product }>('/products', 'POST', compareAtPrice === null ? rest : data)).data;
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      // a SKU conflict names the SKU; a duplicate slug only says "duplicate"
      const sku = /SKU/.test(err.message);
      return sku
        ? { status: 'error', message: err.message }
        : { status: 'error', message: 'Another product already uses this URL name.', fieldErrors: { slug: 'Already in use' } };
    }
    return failure(err, id ? `/admin/products/${id}` : '/admin/products/new');
  }
  if (!id) redirect(`/admin/products/${saved.id}?created=1`);
  refresh();
  // the saved product (with generated SKUs, trimmed text) becomes the form's new baseline
  return { status: 'ok', message: 'Saved. The shop shows the change now.', product: saved };
}

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
