import { DomainError } from '@shared/domain/DomainError';
import { assertSufficientStock, findVariant, type Product } from '@modules/catalog';
import type { OrderItem } from '../order.entity';

export interface LineRequest {
  productId: string;
  sku: string;
  quantity: number;
}

/** Prices each requested line from the current catalog and checks variant stock. */
export function buildOrderLines(products: Product[], requests: LineRequest[]): OrderItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return requests.map((req) => {
    const product = byId.get(req.productId);
    if (!product) throw new DomainError('One or more products not found', 'NOT_FOUND');
    const variant = findVariant(product, req.sku);
    assertSufficientStock(variant.stock, req.quantity, product.title);
    return {
      product: product.id,
      sku: variant.sku,
      size: variant.size,
      width: variant.width,
      title: product.title,
      image: product.images[0],
      price: product.price,
      quantity: req.quantity,
    };
  });
}
