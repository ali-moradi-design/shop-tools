import type { IProductRepository, ICategoryRepository, IWarehouseRepository } from '../domain/product.repository';
import {
  parseSpecFilters,
  unitsOf,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
  type ProductListFilter,
  type ProductFacets,
  type SpecDefinition,
  type UnitOption,
  type Warehouse,
} from '../domain';
import { DomainError } from '@shared/domain/DomainError';
import { AppError } from '@shared/errors/AppError';
import { paginate } from '@shared/pagination';

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

/** One line of the compare table: a specification with its value for each product. */
export interface CompareRow {
  key: string;
  label: string;
  group: string;
  kind: SpecDefinition['kind'];
  unit?: string;
  units: UnitOption[];
  better?: 'higher' | 'lower';
  /** One entry per compared product, in order; null when the product has no value. */
  values: (number | string | null)[];
  /** True where the value is the best in the row (only when the specification has a `better` direction). */
  best: boolean[];
  /** True when every product has the same value (the "differences only" switch hides these). */
  same: boolean;
}

export interface CompareResult {
  category: { slug: string; name: string };
  products: Product[];
  rows: CompareRow[];
  warehouses: Warehouse[];
}

export class ProductService {
  constructor(
    private readonly products: IProductRepository,
    private readonly categories: ICategoryRepository,
    private readonly warehouses: IWarehouseRepository,
  ) {}

  /**
   * `rawSpecs` are the `spec.<key>=...` query values; they are turned into typed filters
   * (in base units) using the category's specification definitions.
   */
  async list(filter: ProductListFilter, rawSpecs: Record<string, string> = {}) {
    const { page, limit } = paginate(filter.page, filter.limit);
    const specs = await this.resolveSpecFilters(filter.category, rawSpecs);
    const { data, total } = await this.products.list({ ...filter, specs, page, limit });
    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  facets(filter: { category?: string }): Promise<ProductFacets> {
    return this.products.facets(filter);
  }

  async listFeatured(limit = 20): Promise<Product[]> {
    return this.products.listFeatured(limit);
  }

  async getById(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async getBySlug(slug: string): Promise<Product> {
    const product = await this.products.findBySlug(slug);
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  /**
   * Side-by-side table for 2 to 4 products of one category. Numbers stay in the base unit;
   * the client converts with `units`. For specifications with a direction (`better`) the
   * best value of each row is marked.
   */
  async compare(slugs: string[]): Promise<CompareResult> {
    const unique = [...new Set(slugs.map((s) => s.toLowerCase()))];
    if (unique.length < COMPARE_MIN || unique.length > COMPARE_MAX) {
      throw new DomainError(`Compare ${COMPARE_MIN} to ${COMPARE_MAX} different products`, 'VALIDATION');
    }
    const products = await this.products.findBySlugs(unique);
    const missing = unique.filter((s) => !products.some((p) => p.slug === s));
    if (missing.length) throw new AppError(`Product not found: ${missing.join(', ')}`, 404);
    const category = products[0].category;
    if (products.some((p) => p.category !== category)) {
      throw new DomainError('Only products of the same category can be compared', 'VALIDATION');
    }
    const info = await this.categories.findBySlug(category);
    if (!info) throw new AppError('Category not found', 404);

    const rows: CompareRow[] = [];
    for (const def of info.specs) {
      const values = products.map((p) => p.specs.find((s) => s.key === def.key)?.value ?? null);
      if (values.every((v) => v === null)) continue;
      const numbers = values.filter((v): v is number => typeof v === 'number');
      const target =
        def.better === 'higher' ? Math.max(...numbers) : def.better === 'lower' ? Math.min(...numbers) : undefined;
      const same = values.every((v) => v === values[0]);
      rows.push({
        key: def.key,
        label: def.label,
        group: def.group,
        kind: def.kind,
        unit: def.unit,
        units: unitsOf(def.unitFamily).length ? unitsOf(def.unitFamily) : def.unit ? [{ symbol: def.unit, factor: 1 }] : [],
        better: def.better,
        values,
        best: values.map((v) => !same && target !== undefined && v === target),
        same,
      });
    }
    return {
      category: { slug: info.slug, name: info.name },
      products,
      rows,
      warehouses: await this.warehouses.list(),
    };
  }

  create(input: CreateProductInput): Promise<Product> {
    return this.products.create(input);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = await this.products.update(id, input);
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async remove(id: string): Promise<void> {
    const product = await this.products.softDelete(id);
    if (!product) throw new AppError('Product not found', 404);
  }

  private async resolveSpecFilters(category: string | undefined, raw: Record<string, string>) {
    if (Object.keys(raw).length === 0) return [];
    if (!category) {
      throw new DomainError('Choose a category to filter by specifications', 'VALIDATION');
    }
    const info = await this.categories.findBySlug(category);
    if (!info) throw new DomainError(`Unknown category "${category}"`, 'VALIDATION');
    return parseSpecFilters(raw, info.specs);
  }
}
