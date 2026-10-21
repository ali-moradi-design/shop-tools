import { DomainError } from '@shared/domain/DomainError';
import type { Product, ProductVariant } from '../product.entity';

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function assertPositiveQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new DomainError('Quantity must be a positive integer', 'VALIDATION');
  }
}

export function assertSufficientStock(
  available: number,
  requested: number,
  title?: string,
): void {
  if (available < requested) {
    const label = title ? `"${title}"` : 'product';
    throw new DomainError(
      `Insufficient stock for ${label} (available: ${available})`,
      'INSUFFICIENT_STOCK',
      { available, requested },
    );
  }
}

export function findVariant(product: Product, sku: string): ProductVariant {
  const variant = product.variants.find((v) => v.sku === sku);
  if (!variant) {
    throw new DomainError(`Size not available for "${product.title}"`, 'NOT_FOUND');
  }
  return variant;
}

export function isStockLow(stock: number, threshold = DEFAULT_LOW_STOCK_THRESHOLD): boolean {
  return stock <= threshold;
}
