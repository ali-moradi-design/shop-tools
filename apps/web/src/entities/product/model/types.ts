import type { UnitOption } from '@/shared/lib/units';

export interface WarehouseStock {
  warehouse: string;
  quantity: number;
}

export interface ProductVariant {
  sku: string;
  label: string;
  /** Overrides the product price when set. */
  price?: number;
  stock: number;
  stockByWarehouse: WarehouseStock[];
}

export interface ProductSpecValue {
  key: string;
  label: string;
  group: string;
  kind: 'number' | 'text';
  unit?: string;
  unitFamily?: string;
  /** Numbers are in the base unit. */
  value: number | string;
}

/** Mirrors the API's product. Money is in cents. */
export interface Product {
  id: string;
  slug: string;
  title: string;
  brand: string;
  model?: string;
  category: string;
  categoryName: string;
  description: string;
  features: string[];
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  variants: ProductVariant[];
  stock: number;
  warehouses: WarehouseStock[];
  specs: ProductSpecValue[];
  tags: string[];
  featured: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface SpecFacet {
  key: string;
  label: string;
  group: string;
  kind: 'number' | 'text';
  unit?: string;
  units: UnitOption[];
  min?: number;
  max?: number;
  options?: FacetCount[];
  better?: 'higher' | 'lower';
}

export interface ProductFacets {
  price: { min: number; max: number };
  specs: SpecFacet[];
  warehouses: { code: string; name: string; count: number }[];
}

export type ProductSort = 'featured' | 'price' | 'title' | 'createdAt' | 'stock' | 'rating';

export interface ProductQuery {
  q?: string;
  category?: string;
  /** `spec.<key>` filters, e.g. { 'spec.torque': '40..100Nm' }. */
  specs?: Record<string, string>;
  warehouse?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: ProductSort;
  order?: 'asc' | 'desc';
}

export interface CompareRow {
  key: string;
  label: string;
  group: string;
  kind: 'number' | 'text';
  unit?: string;
  units: UnitOption[];
  better?: 'higher' | 'lower';
  values: (number | string | null)[];
  best: boolean[];
  same: boolean;
}

export interface Comparison {
  category: { slug: string; name: string };
  products: Product[];
  rows: CompareRow[];
  warehouses: { code: string; name: string; city: string; sortOrder: number }[];
}
