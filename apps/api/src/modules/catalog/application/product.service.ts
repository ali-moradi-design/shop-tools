import type { IProductRepository } from '@modules/catalog/domain/product.repository';
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductListFilter,
  ProductFacets,
} from '@modules/catalog/domain/product.entity';
import { AppError } from '@shared/errors/AppError';
import { paginate } from '@shared/pagination';

export class ProductService {
  constructor(private readonly products: IProductRepository) {}

  async list(filter: ProductListFilter) {
    const { page, limit } = paginate(filter.page, filter.limit);
    const { data, total } = await this.products.list({ ...filter, page, limit });
    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  facets(filter: Pick<ProductListFilter, 'category' | 'gender'>): Promise<ProductFacets> {
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

  /** The other colors of the same style, in display order. */
  async colors(slug: string): Promise<Product[]> {
    const product = await this.getBySlug(slug);
    return this.products.listByStyle(product.style);
  }

  async create(input: CreateProductInput): Promise<Product> {
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
}
