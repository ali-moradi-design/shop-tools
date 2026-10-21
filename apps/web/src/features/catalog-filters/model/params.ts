import type { ProductQuery, ProductSort } from '@/entities/product/model/types';

/** URL search params the catalog understands. */
export const FILTER_KEYS = ['q', 'size', 'width', 'leather', 'color', 'sort', 'page'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterParams = Partial<Record<FilterKey, string>>;

export const SORTS: { value: string; label: string; sort: ProductSort; order: 'asc' | 'desc' }[] = [
  { value: 'featured', label: 'Featured', sort: 'featured', order: 'asc' },
  { value: 'newest', label: 'Newest', sort: 'createdAt', order: 'desc' },
  { value: 'price-asc', label: 'Price: Low to High', sort: 'price', order: 'asc' },
  { value: 'price-desc', label: 'Price: High to Low', sort: 'price', order: 'desc' },
];

export function readFilters(sp: Record<string, string | string[] | undefined>): FilterParams {
  const out: FilterParams = {};
  for (const key of FILTER_KEYS) {
    const v = sp[key];
    const value = Array.isArray(v) ? v[0] : v;
    if (value) out[key] = value.slice(0, 100);
  }
  return out;
}

export function toProductQuery(f: FilterParams): ProductQuery {
  const sort = SORTS.find((s) => s.value === f.sort) ?? SORTS[0];
  const page = Number(f.page);
  return {
    q: f.q,
    size: f.size,
    width: f.width,
    leather: f.leather,
    color: f.color,
    sort: sort.sort,
    order: sort.order,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
