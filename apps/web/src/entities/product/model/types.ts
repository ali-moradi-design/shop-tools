import type { ProductCategory, ProductGender } from '@/shared/config';

export type { ProductCategory, ProductGender };

export interface ProductVariant {
  sku: string;
  size: string;
  width?: string;
  stock: number;
}

/** Mirrors the API's ProductDto. Money is in cents. */
export interface Product {
  id: string;
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
  features: string[];
  leather?: string;
  construction?: string;
  sole?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  variants: ProductVariant[];
  stock: number;
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

export interface ProductFacets {
  colors: FacetCount[];
  leathers: FacetCount[];
  sizes: FacetCount[];
  widths: FacetCount[];
  price: { min: number; max: number };
}

export type ProductSort = 'featured' | 'price' | 'title' | 'createdAt';

export interface ProductQuery {
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
