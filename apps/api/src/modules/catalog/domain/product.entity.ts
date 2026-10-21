export const PRODUCT_CATEGORIES = [
  'boots',
  'shoes',
  'bags',
  'belts',
  'wallets',
  'accessories',
  'care',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_GENDERS = ['men', 'women', 'unisex'] as const;
export type ProductGender = (typeof PRODUCT_GENDERS)[number];

/** One purchasable size of a product. Each variant has its own stock. */
export interface ProductVariant {
  sku: string;
  size: string;
  width?: string;
  stock: number;
}

/**
 * A product is one style in one color (like the reference shop): the colors of a
 * style are sibling products that share `style`.
 * Money is stored in minor units (cents).
 */
export interface Product {
  id: string;
  slug: string;
  /** Full display title, e.g. "President | Bull Brown". */
  title: string;
  /** Style name, e.g. "President". */
  name: string;
  /** Style key shared by all colors of a style, e.g. "mens-president". */
  style: string;
  color: string;
  /** Broad color used by the filter, e.g. "Brown". */
  colorFamily: string;
  /** Color group shown on the product page, e.g. "Classic Collection". */
  colorGroup?: string;
  category: ProductCategory;
  gender: ProductGender;
  description: string;
  features: string[];
  leather?: string;
  construction?: string;
  sole?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  variants: ProductVariant[];
  /** Sum of variant stock (kept in sync for queries). */
  stock: number;
  tags: string[];
  featured: boolean;
  featuredOrder?: number;
  ratingAvg: number;
  ratingCount: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInput {
  slug: string;
  title: string;
  name: string;
  style: string;
  color: string;
  colorFamily: string;
  colorGroup?: string;
  category: ProductCategory;
  gender: ProductGender;
  description: string;
  features?: string[];
  leather?: string;
  construction?: string;
  sole?: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  images?: string[];
  variants: ProductVariant[];
  tags?: string[];
  featured?: boolean;
  featuredOrder?: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export type ProductSort = 'featured' | 'price' | 'title' | 'createdAt';

export interface ProductListFilter {
  q?: string;
  category?: ProductCategory;
  gender?: ProductGender;
  style?: string;
  color?: string;
  leather?: string;
  size?: string;
  width?: string;
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

export interface ProductFacets {
  colors: FacetCount[];
  leathers: FacetCount[];
  sizes: FacetCount[];
  widths: FacetCount[];
  price: { min: number; max: number };
}

export function totalStock(variants: ProductVariant[]): number {
  return variants.reduce((sum, v) => sum + v.stock, 0);
}
