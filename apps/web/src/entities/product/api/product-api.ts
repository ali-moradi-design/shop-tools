import { apiGetJson, ApiError, type ApiData, type ApiPaginated } from '@/shared/api';
import type { Product, ProductFacets, ProductQuery } from '../model/types';

function toQuery(params: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Catalog reads. Server-side rendering: nothing is cached, each page render asks the API. */
export async function fetchProducts(query: ProductQuery = {}): Promise<ApiPaginated<Product>> {
  return apiGetJson<ApiPaginated<Product>>(`/products${toQuery(query)}`);
}

export async function fetchFacets(
  query: Pick<ProductQuery, 'category' | 'gender'>,
): Promise<ProductFacets> {
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

/** All colors of the product's style. */
export async function fetchColors(slug: string): Promise<Product[]> {
  const res = await apiGetJson<ApiData<Product[]>>(
    `/products/slug/${encodeURIComponent(slug)}/colors`,
  );
  return res.data;
}

/** Live per-size stock; streamed inside a Suspense boundary so the page shell is not blocked. */
export async function fetchLiveVariants(slug: string): Promise<Product['variants']> {
  const res = await apiGetJson<ApiData<Product>>(`/products/slug/${encodeURIComponent(slug)}`);
  return res.data.variants;
}
