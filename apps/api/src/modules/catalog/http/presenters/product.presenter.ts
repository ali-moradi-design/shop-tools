import type { Product } from '@modules/catalog/domain/product.entity';
import { toProductDto } from '@modules/catalog/application/dto/product.mapper';

export function presentProduct(product: Product) {
  return toProductDto(product);
}

export function presentProducts(products: Product[]) {
  return products.map(presentProduct);
}
