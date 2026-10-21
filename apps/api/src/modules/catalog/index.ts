export { registerCatalogRoutes } from './http/registerRoutes';
export { productRepo, productService, categoryRepo, warehouseRepo, categoryService } from './infra/wiring';
export type {
  Product,
  ProductVariant,
  CreateProductInput,
  VariantInput,
  UpdateProductInput,
  ProductListFilter,
  WarehouseStock,
  StockAllocation,
  SpecDefinition,
  Category,
  Warehouse,
} from './domain';
export { unitPrice, findUnit, unitsOf } from './domain';
export type { IProductRepository, ICategoryRepository, IWarehouseRepository } from './domain';
export {
  assertPositiveQuantity,
  assertSufficientStock,
  findVariant,
  isStockLow,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from './domain/rules/stock';
export { productsPaths } from './http/docs/products.paths';
export { categoriesPaths } from './http/docs/categories.paths';
export { uploadsPaths } from './http/docs/uploads.paths';
