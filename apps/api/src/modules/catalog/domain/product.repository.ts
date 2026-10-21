import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductListFilter,
  ProductFacets,
} from './product.entity';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findByIds(ids: string[]): Promise<Product[]>;
  list(filter: ProductListFilter): Promise<{ data: Product[]; total: number }>;
  listByStyle(style: string): Promise<Product[]>;
  facets(filter: Pick<ProductListFilter, 'category' | 'gender'>): Promise<ProductFacets>;
  listFeatured(limit?: number): Promise<Product[]>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product | null>;
  softDelete(id: string): Promise<Product | null>;
  /** Atomically takes stock from one variant; false when not enough is left. */
  decrementStock(productId: string, sku: string, quantity: number): Promise<boolean>;
  incrementStock(productId: string, sku: string, quantity: number): Promise<void>;
  upsertBySlug(slug: string, data: CreateProductInput): Promise<Product>;
  setRating(productId: string, avg: number, count: number): Promise<void>;
  count(): Promise<number>;
  countLowStock(threshold: number): Promise<number>;
  findLowStock(threshold: number, limit?: number): Promise<Product[]>;
}
