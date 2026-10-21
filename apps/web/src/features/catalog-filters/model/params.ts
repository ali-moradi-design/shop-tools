import type { ProductQuery, ProductSort } from '@/entities/product/model/types';

/** Plain URL parameters the catalog understands; any `spec.<key>` parameter is a specification filter. */
export const FILTER_KEYS = ['q', 'sort', 'page', 'instock', 'warehouse', 'price'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterParams = Record<string, string>;

export const SORTS: { value: string; label: string; sort: ProductSort; order: 'asc' | 'desc' }[] = [
  { value: 'featured', label: 'Featured', sort: 'featured', order: 'asc' },
  { value: 'price-asc', label: 'Price: low → high', sort: 'price', order: 'asc' },
  { value: 'price-desc', label: 'Price: high → low', sort: 'price', order: 'desc' },
  { value: 'stock', label: 'Most in stock', sort: 'stock', order: 'desc' },
  { value: 'rating', label: 'Best rated', sort: 'rating', order: 'desc' },
  { value: 'newest', label: 'Newest', sort: 'createdAt', order: 'desc' },
];

export const isSpecParam = (key: string) => /^spec\.[a-z0-9-]{1,40}$/.test(key);

/** Keeps only the parameters we know, each cut to a sane length. */
export function readFilters(sp: Record<string, string | string[] | undefined>): FilterParams {
  const out: FilterParams = {};
  for (const [key, v] of Object.entries(sp)) {
    if (!(FILTER_KEYS as readonly string[]).includes(key) && !isSpecParam(key)) continue;
    const value = Array.isArray(v) ? v[0] : v;
    if (value) out[key] = value.slice(0, 100);
  }
  return out;
}

/** "50..200" (dollars) → cents. Either end may be missing. */
export function parsePrice(value: string | undefined): { min?: number; max?: number } {
  if (!value) return {};
  const [lo, hi] = value.split('..');
  const toCents = (s: string | undefined) => {
    const n = Number(s);
    return s && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
  };
  return { min: toCents(lo), max: toCents(hi) };
}

export function toProductQuery(f: FilterParams, category?: string): ProductQuery {
  const sort = SORTS.find((s) => s.value === f.sort) ?? SORTS[0];
  const page = Number(f.page);
  const price = parsePrice(f.price);
  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) if (isSpecParam(k)) specs[k] = v;
  return {
    q: f.q,
    category,
    specs,
    warehouse: f.warehouse && /^[A-Z0-9]{2,8}$/.test(f.warehouse) ? f.warehouse : undefined,
    minPrice: price.min,
    maxPrice: price.max,
    inStock: f.instock === '1' ? true : undefined,
    sort: sort.sort,
    order: sort.order,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** A numeric spec filter value: "40..100Nm", "..100", "40.." or "18". */
export function parseRangeParam(value: string | undefined): { lo?: number; hi?: number; unit?: string } {
  if (!value) return {};
  const unitStart = value.search(/[^\d\s.-]/);
  const numbers = unitStart === -1 ? value : value.slice(0, unitStart);
  const unit = unitStart === -1 ? undefined : value.slice(unitStart).trim() || undefined;
  const num = (s: string | undefined) => (s && s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : undefined);
  if (numbers.includes('..')) {
    const [lo, hi] = numbers.split('..');
    return { lo: num(lo), hi: num(hi), unit };
  }
  const exact = num(numbers);
  return { lo: exact, hi: exact, unit };
}

export function formatRangeParam(lo: number, hi: number, unit?: string): string {
  const n = (x: number) => String(Number(x.toPrecision(6)));
  return `${n(lo)}..${n(hi)}${unit ?? ''}`;
}
