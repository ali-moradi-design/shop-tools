import type { ProductSpecValue, SpecDefinition } from './spec.entity';
import type { UnitOption } from './units';
import type { SpecFilter } from './spec-filter';

/** Units of one variant in one warehouse. */
export interface WarehouseStock {
  /** Warehouse code, e.g. "BER". */
  warehouse: string;
  quantity: number;
}

/**
 * A sellable option of a product: "Body only", "2 × 4.0 Ah kit" ... Stock is kept per
 * warehouse; `stock` is the total. `price` overrides the product price when set.
 */
export interface ProductVariant {
  sku: string;
  label: string;
  price?: number;
  stock: number;
  stockByWarehouse: WarehouseStock[];
}

/** Money is stored in minor units (cents). */
export interface Product {
  id: string;
  slug: string;
  title: string;
  brand: string;
  model?: string;
  /** Category slug. */
  category: string;
  categoryName: string;
  description: string;
  features: string[];
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  variants: ProductVariant[];
  /** Sum of every variant in every warehouse (kept in sync for queries). */
  stock: number;
  /** Stock of the whole product per warehouse. */
  warehouses: WarehouseStock[];
  /** Technical specifications, ordered as the category defines them; numbers in the base unit. */
  specs: ProductSpecValue[];
  tags: string[];
  featured: boolean;
  featuredOrder?: number;
  ratingAvg: number;
  ratingCount: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantInput {
  sku: string;
  label: string;
  price?: number;
  /** Units per warehouse code, e.g. { BER: 12, HAM: 4 }. */
  stock: Record<string, number>;
}

export interface CreateProductInput {
  slug: string;
  title: string;
  brand?: string;
  model?: string;
  /** Category slug. */
  category: string;
  description?: string;
  features?: string[];
  price: number;
  compareAtPrice?: number;
  currency?: string;
  images?: string[];
  variants: VariantInput[];
  /** Specification values by key; numbers in the category's base unit. */
  specs?: Record<string, number | string>;
  tags?: string[];
  featured?: boolean;
  featuredOrder?: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export const PRODUCT_SORTS = ['featured', 'price', 'title', 'createdAt', 'stock', 'rating'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export interface ProductListFilter {
  q?: string;
  /** Category slug. */
  category?: string;
  /** Conditions on specifications (needs `category`), already in base units. */
  specs?: SpecFilter[];
  /** Only products with units on the shelf of this warehouse code. */
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

export interface FacetCount {
  value: string;
  count: number;
}

/** Everything the filter sidebar needs for one specification. */
export interface SpecFacet {
  key: string;
  label: string;
  group: string;
  kind: SpecDefinition['kind'];
  unit?: string;
  /** Units the shopper can switch between (base unit first, factors from the base unit). */
  units: UnitOption[];
  /** Numbers: smallest and largest value in the category (base unit). */
  min?: number;
  max?: number;
  /** Words: each value with its product count. */
  options?: FacetCount[];
  better?: 'higher' | 'lower';
}

export interface ProductFacets {
  price: { min: number; max: number };
  specs: SpecFacet[];
  /** Products with stock in each warehouse. */
  warehouses: { code: string; name: string; count: number }[];
}

export function totalStock(variants: { stock: Record<string, number> }[]): number {
  return variants.reduce(
    (sum, v) => sum + Object.values(v.stock).reduce((a, b) => a + b, 0),
    0,
  );
}

/** The price a customer pays for one unit of the variant. */
export function unitPrice(product: Pick<Product, 'price'>, variant: Pick<ProductVariant, 'price'>): number {
  return variant.price ?? product.price;
}
