'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Product } from '@/entities/product';
import { ApiError } from '@/shared/api';
import { serverApi, serverMutate } from '@/shared/api/server';
import type { Category } from '@/entities/category';
import { CARRIERS, STATUS_LABEL, type OrderStatus, type ReturnStatus } from '@/entities/order';
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

export type Shipment = { carrier: (typeof CARRIERS)[number]; trackingNumber: string };

export async function updateOrderStatus(id: string, status: OrderStatus, note?: string, shipment?: Shipment): Promise<ActionResult> {
  try {
    await serverMutate(`/orders/${encodeURIComponent(id)}/status`, 'PATCH', { status, ...(note ? { note } : {}), ...(shipment ? { shipment } : {}) });
  } catch (err) {
    return failure(err, `/admin/orders/${id}`);
  }
  refresh();
  return { status: 'ok', message: `Order moved to ${STATUS_LABEL[status]}.` };
}

export async function updateReturn(id: string, status: ReturnStatus, note?: string): Promise<ActionResult> {
  try {
    await serverMutate(`/returns/${encodeURIComponent(id)}`, 'PATCH', { status, ...(note ? { note } : {}) });
  } catch (err) {
    return failure(err, '/admin/returns');
  }
  refresh();
  return { status: 'ok', message: 'Return updated. The customer was emailed.' };
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

export interface RoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

/** Creates (no id) or updates a role; the API protects the built-in roles. */
export async function saveRole(id: string | undefined, input: RoleInput): Promise<ActionResult> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 50) return { status: 'error', message: 'Use a name of 2–50 characters.' };
  try {
    if (id) await serverMutate(`/roles/${encodeURIComponent(id)}`, 'PATCH', { ...input, name });
    else await serverMutate('/roles', 'POST', { ...input, name });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return { status: 'error', message: 'A role with this name exists.' };
    return failure(err, '/admin/roles');
  }
  refresh();
  return { status: 'ok', message: id ? 'Role saved.' : `${name} created.` };
}

export async function deleteRole(id: string): Promise<ActionResult> {
  try {
    await serverMutate(`/roles/${encodeURIComponent(id)}`, 'DELETE');
  } catch (err) {
    return failure(err, '/admin/roles');
  }
  refresh();
  return { status: 'ok', message: 'Role deleted.' };
}

export interface ImportReport {
  created: number;
  updated: number;
  errors: { row: number; slug?: string; message: string }[];
  dryRun: boolean;
}

/** Checks (dryRun) or applies a product CSV. */
export async function importProducts(csv: string, dryRun: boolean): Promise<ActionResult & { report?: ImportReport }> {
  if (!csv.trim()) return { status: 'error', message: 'Choose a CSV file first.' };
  if (csv.length > 2_000_000) return { status: 'error', message: 'The file is too large (2 MB at most).' };
  let report: ImportReport;
  try {
    report = (await serverMutate<{ data: ImportReport }>('/admin/import/products', 'POST', { csv, dryRun })).data;
  } catch (err) {
    return failure(err, '/admin/products/import');
  }
  if (!dryRun && report.created + report.updated > 0) refresh();
  const total = report.created + report.updated;
  const verb = dryRun ? 'would be' : 'were';
  return {
    status: report.errors.length ? 'error' : 'ok',
    message: `${report.created} new and ${report.updated} existing products ${verb} saved${report.errors.length ? `; ${report.errors.length} rows have problems` : ''}.${dryRun && total ? ' Check the list, then import.' : ''}`,
    report,
  };
}
