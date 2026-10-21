import { apiGetJson, ApiError, type ApiData, type ApiPaginated } from '@/shared/api';
import type { Comparison, Product, ProductFacets, ProductQuery } from '../model/types';

/** `{ category: 'drills', specs: { 'spec.torque': '40..100Nm' } }` → `?category=drills&spec.torque=40..100Nm`. */
export function toQuery(params: ProductQuery): string {
  const sp = new URLSearchParams();
  const { specs, ...rest } = params;
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  for (const [k, v] of Object.entries(specs ?? {})) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Catalog reads. Server-side rendering: nothing is cached, each page render asks the API. */
export async function fetchProducts(query: ProductQuery = {}): Promise<ApiPaginated<Product>> {
  return apiGetJson<ApiPaginated<Product>>(`/products${toQuery(query)}`);
}

export async function fetchFacets(query: Pick<ProductQuery, 'category'> = {}): Promise<ProductFacets> {
  const res = await apiGetJson<ApiData<ProductFacets>>(`/products/facets${toQuery(query)}`);
  return res.data;
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    const res = await apiGetJson<ApiData<Product>>(`/products/slug/${encodeURIComponent(slug)}`);
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Live stock per variant and warehouse; streamed inside a Suspense boundary so the page shell is not blocked. */
export async function fetchLiveVariants(slug: string): Promise<Product['variants']> {
  const res = await apiGetJson<ApiData<Product>>(`/products/slug/${encodeURIComponent(slug)}`);
  return res.data.variants;
}

/** 2 to 4 products of one category, side by side. */
export async function fetchComparison(slugs: string[]): Promise<Comparison | null> {
  try {
    const res = await apiGetJson<ApiData<Comparison>>(`/products/compare?slugs=${encodeURIComponent(slugs.join(','))}`);
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 400 || err.status === 404)) return null;
    throw err;
  }
}
