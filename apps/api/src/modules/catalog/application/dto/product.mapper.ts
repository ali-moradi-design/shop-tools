import type { Product } from '@modules/catalog/domain/product.entity';

/** HTTP shape of a product (internal soft-delete fields left out). */
export type ProductDto = Omit<Product, 'deletedAt'>;

export function toProductDto(product: Product): ProductDto {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deletedAt, ...dto } = product;
  return dto;
}
