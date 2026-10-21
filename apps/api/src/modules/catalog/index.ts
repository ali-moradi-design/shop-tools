export { registerCatalogRoutes } from './http/registerRoutes';
export { productRepo, productService } from './infra/wiring';
export type {
  Product,
  ProductVariant,
  ProductCategory,
  ProductGender,
  CreateProductInput,
  UpdateProductInput,
  ProductListFilter,
} from './domain/product.entity';
export { PRODUCT_CATEGORIES, PRODUCT_GENDERS } from './domain/product.entity';
export type { IProductRepository } from './domain/product.repository';
export {
  assertPositiveQuantity,
  assertSufficientStock,
  findVariant,
  isStockLow,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from './domain/rules/stock';
export { productsPaths } from './http/docs/products.paths';
export { uploadsPaths } from './http/docs/uploads.paths';
