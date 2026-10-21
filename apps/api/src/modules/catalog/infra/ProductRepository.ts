import type { PipelineStage } from 'mongoose';
import type { IProductRepository } from '@modules/catalog/domain/product.repository';
import {
  totalStock,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
  type ProductListFilter,
  type ProductFacets,
  type FacetCount,
} from '@modules/catalog/domain/product.entity';
import { ProductModel } from './models/ProductModel';
import { mapProduct } from './mappers';
import { paginate } from '@shared/pagination';

/**
 * Search uses a case-insensitive regex on title/name/color/description (works for
 * partial words); the text index is kept for a future relevance search.
 */
export class MongooseProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    const doc = await ProductModel.findById(id);
    return doc ? mapProduct(doc) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const doc = await ProductModel.findOne({ slug: slug.toLowerCase() });
    return doc ? mapProduct(doc) : null;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    const docs = await ProductModel.find({ _id: { $in: ids } });
    return docs.map(mapProduct);
  }

  async list(filter: ProductListFilter): Promise<{ data: Product[]; total: number }> {
    const { limit, skip } = paginate(filter.page, filter.limit);
    const query = buildQuery(filter);
    const dir = filter.order === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> =
      !filter.sort || filter.sort === 'featured'
        ? { featuredOrder: 1, createdAt: -1 }
        : { [filter.sort]: dir, _id: 1 };

    const [docs, total] = await Promise.all([
      ProductModel.find(query).sort(sort).skip(skip).limit(limit),
      ProductModel.countDocuments(query),
    ]);
    return { data: docs.map(mapProduct), total };
  }

  async listByStyle(style: string): Promise<Product[]> {
    const docs = await ProductModel.find({ style }).sort({ featuredOrder: 1, createdAt: 1 });
    return docs.map(mapProduct);
  }

  async facets(
    filter: Pick<ProductListFilter, 'category' | 'gender'>,
  ): Promise<ProductFacets> {
    const match = { ...buildQuery(filter), deletedAt: null };
    const count = (field: string): PipelineStage.FacetPipelineStage[] => [
      { $match: { [field]: { $nin: [null, ''] } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ];
    const [result] = await ProductModel.aggregate<{
      colors: { _id: string; count: number }[];
      leathers: { _id: string; count: number }[];
      sizes: { _id: string; count: number }[];
      widths: { _id: string; count: number }[];
      price: { min: number; max: number }[];
    }>([
      { $match: match },
      {
        $facet: {
          colors: count('colorFamily'),
          leathers: count('leather'),
          sizes: [
            { $unwind: '$variants' },
            { $group: { _id: '$variants.size', products: { $addToSet: '$_id' } } },
            { $project: { count: { $size: '$products' } } },
          ],
          widths: [
            { $unwind: '$variants' },
            { $match: { 'variants.width': { $nin: [null, ''] } } },
            { $group: { _id: '$variants.width', products: { $addToSet: '$_id' } } },
            { $project: { count: { $size: '$products' } } },
            { $sort: { _id: 1 } },
          ],
          price: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
        },
      },
    ]);
    const toCounts = (rows: { _id: string; count: number }[]): FacetCount[] =>
      rows.map((r) => ({ value: r._id, count: r.count }));
    return {
      colors: toCounts(result.colors),
      leathers: toCounts(result.leathers),
      sizes: toCounts(result.sizes).sort(compareSizes),
      widths: toCounts(result.widths),
      price: result.price[0] ? { min: result.price[0].min, max: result.price[0].max } : { min: 0, max: 0 },
    };
  }

  async listFeatured(limit = 20): Promise<Product[]> {
    const docs = await ProductModel.find({ featured: true })
      .sort({ featuredOrder: 1, createdAt: -1 })
      .limit(limit);
    return docs.map(mapProduct);
  }

  async create(input: CreateProductInput): Promise<Product> {
    const doc = await ProductModel.create({
      ...input,
      featured: input.featured ?? false,
      featuredOrder: input.featuredOrder ?? 0,
    });
    return mapProduct(doc);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const patch: Record<string, unknown> = { ...input };
    if (input.variants) patch.stock = totalStock(input.variants);
    const doc = await ProductModel.findByIdAndUpdate(id, patch, {
      returnDocument: 'after',
      runValidators: true,
    });
    return doc ? mapProduct(doc) : null;
  }

  async softDelete(id: string): Promise<Product | null> {
    const doc = await ProductModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' },
    );
    return doc ? mapProduct(doc) : null;
  }

  async decrementStock(productId: string, sku: string, quantity: number): Promise<boolean> {
    const result = await ProductModel.updateOne(
      {
        _id: productId,
        deletedAt: null,
        variants: { $elemMatch: { sku, stock: { $gte: quantity } } },
      },
      { $inc: { 'variants.$.stock': -quantity, stock: -quantity } },
    );
    return result.modifiedCount === 1;
  }

  async incrementStock(productId: string, sku: string, quantity: number): Promise<void> {
    await ProductModel.updateOne(
      { _id: productId, 'variants.sku': sku },
      { $inc: { 'variants.$.stock': quantity, stock: quantity } },
    );
  }

  async upsertBySlug(slug: string, data: CreateProductInput): Promise<Product> {
    const doc = await ProductModel.findOneAndUpdate(
      { slug },
      { ...data, stock: totalStock(data.variants) },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    return mapProduct(doc!);
  }

  async setRating(productId: string, avg: number, count: number): Promise<void> {
    await ProductModel.updateOne({ _id: productId }, { ratingAvg: avg, ratingCount: count });
  }

  async count(): Promise<number> {
    return ProductModel.countDocuments();
  }

  async countLowStock(threshold: number): Promise<number> {
    return ProductModel.countDocuments({ stock: { $lte: threshold } });
  }

  async findLowStock(threshold: number, limit = 50): Promise<Product[]> {
    const docs = await ProductModel.find({ stock: { $lte: threshold } })
      .sort({ stock: 1 })
      .limit(limit);
    return docs.map(mapProduct);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildQuery(filter: ProductListFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filter.q) {
    const re = { $regex: escapeRegex(filter.q), $options: 'i' };
    query.$or = [{ title: re }, { name: re }, { color: re }, { description: re }];
  }
  if (filter.category) query.category = filter.category;
  if (filter.gender) query.gender = { $in: [filter.gender, 'unisex'] };
  if (filter.style) query.style = filter.style;
  if (filter.color) query.colorFamily = filter.color;
  if (filter.leather) query.leather = filter.leather;
  if (filter.size || filter.width) {
    const variant: Record<string, unknown> = { stock: { $gt: 0 } };
    if (filter.size) variant.size = filter.size;
    if (filter.width) variant.width = filter.width;
    query.variants = { $elemMatch: variant };
  }
  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (filter.minPrice !== undefined) price.$gte = filter.minPrice;
    if (filter.maxPrice !== undefined) price.$lte = filter.maxPrice;
    query.price = price;
  }
  if (filter.inStock === true) query.stock = { $gt: 0 };
  else if (filter.inStock === false) query.stock = { $lte: 0 };
  if (filter.featured !== undefined) query.featured = filter.featured;
  return query;
}

/** Numeric sizes first in numeric order (6, 6.5, 7 …), then the rest alphabetically. */
function compareSizes(a: FacetCount, b: FacetCount): number {
  const na = Number(a.value);
  const nb = Number(b.value);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  if (!Number.isNaN(na)) return -1;
  if (!Number.isNaN(nb)) return 1;
  return a.value.localeCompare(b.value);
}
