'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Product } from '@/entities/product';
import { ApiError } from '@/shared/api';
import { serverApi, serverMutate } from '@/shared/api/server';
import type { Category } from '@/entities/category';
import { STATUS_LABEL, type OrderStatus } from '@/entities/order';
import type { ActionResult } from '../model/action-result';
import { discountFormSchema, type DiscountFormValues } from '../model/discount-form';
import { issuesToFieldErrors, productFormSchema, toCents, toProductPayload, toSpecs, type ProductFormValues } from '../model/product-form';

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

export async function updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<ActionResult> {
  try {
    await serverMutate(`/orders/${encodeURIComponent(id)}/status`, 'PATCH', { status, ...(note ? { note } : {}) });
  } catch (err) {
    return failure(err, `/admin/orders/${id}`);
  }
  refresh();
  return { status: 'ok', message: `Order moved to ${STATUS_LABEL[status]}.` };
}

/** Creates a discount code. Fixed amounts and the minimum order come in dollars. */
export async function createDiscount(values: DiscountFormValues): Promise<ActionResult> {
  const parsed = discountFormSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: 'Please fix the highlighted fields.', fieldErrors: issuesToFieldErrors(parsed.error) };
  }
  const v = parsed.data;
  try {
    await serverMutate('/discounts', 'POST', {
      code: v.code,
      type: v.type,
      value: v.type === 'fixed' ? toCents(v.value) : Number(v.value),
      ...(v.minOrderAmount ? { minOrderAmount: toCents(v.minOrderAmount) } : {}),
      ...(v.maxUses ? { maxUses: Number(v.maxUses) } : {}),
      ...(v.endsAt ? { endsAt: new Date(`${v.endsAt}T23:59:59Z`).toISOString() } : {}),
      isActive: true,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { status: 'error', message: 'This code already exists.', fieldErrors: { code: 'Already exists' } };
    }
    return failure(err, '/admin/discounts');
  }
  refresh();
  return { status: 'ok', message: `${v.code} is live.` };
}

export async function setDiscountActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await serverMutate(`/discounts/${encodeURIComponent(id)}`, 'PATCH', { isActive });
  } catch (err) {
    return failure(err, '/admin/discounts');
  }
  refresh();
  return { status: 'ok', message: isActive ? 'Activated.' : 'Paused.' };
}

export async function deleteDiscount(id: string): Promise<ActionResult> {
  try {
    await serverMutate(`/discounts/${encodeURIComponent(id)}`, 'DELETE');
  } catch (err) {
    return failure(err, '/admin/discounts');
  }
  refresh();
  return { status: 'ok', message: 'Deleted.' };
}

/** Activates or blocks a customer account. */
export async function setUserActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await serverMutate(`/users/${encodeURIComponent(id)}`, 'PATCH', { isActive });
  } catch (err) {
    return failure(err, '/admin/customers');
  }
  refresh();
  return { status: 'ok', message: isActive ? 'Account active.' : 'Account blocked.' };
}

/** Replaces the user's roles with the given role ids. */
export async function setUserRoles(id: string, roles: string[]): Promise<ActionResult> {
  try {
    await serverMutate(`/users/${encodeURIComponent(id)}`, 'PATCH', { roles });
  } catch (err) {
    return failure(err, '/admin/customers');
  }
  refresh();
  return { status: 'ok', message: 'Roles updated.' };
}

/** Removes a review; the API recalculates the product's rating. */
export async function deleteReview(id: string): Promise<ActionResult> {
  try {
    await serverMutate(`/reviews/${encodeURIComponent(id)}`, 'DELETE');
  } catch (err) {
    return failure(err, '/admin/reviews');
  }
  refresh();
  return { status: 'ok', message: 'Review removed.' };
}
