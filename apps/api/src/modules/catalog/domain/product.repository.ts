import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductListFilter,
  ProductFacets,
} from './product.entity';
import type { Category, Warehouse, SpecDefinition } from './spec.entity';

/** Where the units of an order line came from. */
export interface StockAllocation {
  warehouse: string;
  quantity: number;
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findBySlugs(slugs: string[]): Promise<Product[]>;
  findByIds(ids: string[]): Promise<Product[]>;
  list(filter: ProductListFilter): Promise<{ data: Product[]; total: number }>;
  facets(filter: { category?: string }): Promise<ProductFacets>;
  listFeatured(limit?: number): Promise<Product[]>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product | null>;
  softDelete(id: string): Promise<Product | null>;
  /**
   * Takes `quantity` units of one variant, from the warehouses in dispatch order, as one
   * atomic step. Returns where they came from, or null when there are not enough in total.
   */
  decrementStock(productId: string, sku: string, quantity: number): Promise<StockAllocation[] | null>;
  /** Puts units back (into `warehouse`, or the first warehouse when not given). */
  incrementStock(productId: string, sku: string, quantity: number, warehouse?: string): Promise<void>;
  upsertBySlug(slug: string, data: CreateProductInput): Promise<Product>;
  setRating(productId: string, avg: number, count: number): Promise<void>;
  count(): Promise<number>;
  countLowStock(threshold: number): Promise<number>;
  findLowStock(threshold: number, limit?: number): Promise<Product[]>;
}

export interface ICategoryRepository {
  list(): Promise<Category[]>;
  findBySlug(slug: string): Promise<Category | null>;
  /** Creates or updates a category and its specification definitions (seed). */
  upsert(input: {
    slug: string;
    name: string;
    description?: string;
    sortOrder: number;
    specs: SpecDefinition[];
  }): Promise<Category>;
}

export interface IWarehouseRepository {
  list(): Promise<Warehouse[]>;
  upsert(input: Warehouse): Promise<Warehouse>;
}
