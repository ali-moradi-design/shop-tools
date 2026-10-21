import type { Product, ProductVariant } from './types';

/** The price of one unit of a variant (its own price, or the product's). */
export function variantPrice(product: Pick<Product, 'price'>, variant: Pick<ProductVariant, 'price'>): number {
  return variant.price ?? product.price;
}

/** What the cheapest in-stock (or, failing that, any) variant costs: shown on cards. */
export function lowestPrice(product: Product): number {
  const pool = product.variants.some((v) => v.stock > 0) ? product.variants.filter((v) => v.stock > 0) : product.variants;
  return pool.reduce((min, v) => Math.min(min, variantPrice(product, v)), product.price);
}
