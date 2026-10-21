import { Prisma } from '@prisma/client';
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
import { getPrisma, prisma, type PrismaTx } from '@shared/infra/prisma/client';
import { paginate } from '@shared/pagination';
import { mapProduct } from './mappers';

const withVariants = { variants: true } as const;
const live = { deletedAt: null } as const;

/** `%`, `_` and `\` mean something inside LIKE; a visitor's search text must not. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, '\\$&');
}

/** Runs `fn` inside the open unit of work, or in its own transaction when there is none. */
function inTransaction<T>(fn: (tx: PrismaTx) => Promise<T>): Promise<T> {
  const client = getPrisma();
  return client === prisma ? prisma.$transaction((tx) => fn(tx)) : fn(client);
}

/** `Product.stock` is the sum of its variants; recomputed after every stock change. */
async function syncStock(tx: PrismaTx, productId: string): Promise<void> {
  await tx.$executeRaw`UPDATE Product
    SET stock = (SELECT COALESCE(SUM(stock), 0) FROM ProductVariant WHERE productId = ${productId})
    WHERE id = ${productId}`;
}

const variantRows = (variants: CreateProductInput['variants']) =>
  variants.map((v, position) => ({
    sku: v.sku.trim(),
    size: v.size.trim(),
    width: v.width?.trim() || null,
    stock: v.stock,
    position,
  }));

/** Only the fields the caller sent: used by create (after defaults) and by partial updates. */
function scalarData(i: UpdateProductInput): Prisma.ProductUncheckedUpdateInput {
  const d: Prisma.ProductUncheckedUpdateInput = {};
  if (i.slug !== undefined) d.slug = i.slug.trim().toLowerCase();
  if (i.title !== undefined) d.title = i.title;
  if (i.name !== undefined) d.name = i.name;
  if (i.style !== undefined) d.style = i.style;
  if (i.color !== undefined) d.color = i.color;
  if (i.colorFamily !== undefined) d.colorFamily = i.colorFamily;
  if (i.colorGroup !== undefined) d.colorGroup = i.colorGroup;
  if (i.category !== undefined) d.category = i.category;
  if (i.gender !== undefined) d.gender = i.gender;
  if (i.description !== undefined) d.description = i.description;
  if (i.features !== undefined) d.features = i.features;
  if (i.leather !== undefined) d.leather = i.leather;
  if (i.construction !== undefined) d.construction = i.construction;
  if (i.sole !== undefined) d.sole = i.sole;
  if (i.price !== undefined) d.price = i.price;
  if (i.compareAtPrice !== undefined) d.compareAtPrice = i.compareAtPrice;
  if (i.currency !== undefined) d.currency = i.currency.toUpperCase();
  if (i.images !== undefined) d.images = i.images;
  if (i.tags !== undefined) d.tags = i.tags;
  if (i.featured !== undefined) d.featured = i.featured;
  if (i.featuredOrder !== undefined) d.featuredOrder = i.featuredOrder;
  return d;
}

function createData(input: CreateProductInput): Prisma.ProductUncheckedCreateInput {
  return {
    ...(scalarData(input) as Prisma.ProductUncheckedCreateInput),
    // required columns without a database default
    description: input.description ?? '',
    features: input.features ?? [],
    images: input.images ?? [],
    tags: input.tags ?? [],
    slug: input.slug.trim().toLowerCase(),
    title: input.title,
    name: input.name,
    style: input.style,
    color: input.color,
    colorFamily: input.colorFamily,
    category: input.category,
    gender: input.gender,
    price: input.price,
    stock: totalStock(input.variants),
    variants: { create: variantRows(input.variants) },
  };
}

function buildWhere(filter: ProductListFilter): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...live };
  if (filter.q) {
    const contains = escapeLike(filter.q);
    where.OR = [
      { title: { contains } },
      { name: { contains } },
      { color: { contains } },
      { description: { contains } },
    ];
  }
  if (filter.category) where.category = filter.category;
  if (filter.gender) where.gender = { in: [filter.gender, 'unisex'] };
  if (filter.style) where.style = filter.style;
  if (filter.color) where.colorFamily = filter.color;
  if (filter.leather) where.leather = filter.leather;
  if (filter.size || filter.width) {
    // the size (and width) the visitor picked must be in stock
    where.variants = {
      some: {
        stock: { gt: 0 },
        ...(filter.size ? { size: filter.size } : {}),
        ...(filter.width ? { width: filter.width } : {}),
      },
    };
  }
  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    where.price = {
      ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}),
      ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}),
    };
  }
  if (filter.inStock === true) where.stock = { gt: 0 };
  else if (filter.inStock === false) where.stock = { lte: 0 };
  if (filter.featured !== undefined) where.featured = filter.featured;
  return where;
}

export class PrismaProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    const row = await getPrisma().product.findFirst({ where: { id, ...live }, include: withVariants });
    return row ? mapProduct(row) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await getPrisma().product.findFirst({
      where: { slug: slug.toLowerCase(), ...live },
      include: withVariants,
    });
    return row ? mapProduct(row) : null;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    const rows = await getPrisma().product.findMany({
      where: { id: { in: ids }, ...live },
      include: withVariants,
    });
    return rows.map(mapProduct);
  }

  async list(filter: ProductListFilter): Promise<{ data: Product[]; total: number }> {
    const { limit, skip } = paginate(filter.page, filter.limit);
    const where = buildWhere(filter);
    const dir = filter.order === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      !filter.sort || filter.sort === 'featured'
        ? [{ featuredOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }]
        : [{ [filter.sort]: dir }, { id: 'asc' }];

    const client = getPrisma();
    const [rows, total] = await Promise.all([
      client.product.findMany({ where, orderBy, skip, take: limit, include: withVariants }),
      client.product.count({ where }),
    ]);
    return { data: rows.map(mapProduct), total };
  }

  async listByStyle(style: string): Promise<Product[]> {
    const rows = await getPrisma().product.findMany({
      where: { style, ...live },
      orderBy: [{ featuredOrder: 'asc' }, { createdAt: 'asc' }],
      include: withVariants,
    });
    return rows.map(mapProduct);
  }

  async facets(filter: Pick<ProductListFilter, 'category' | 'gender'>): Promise<ProductFacets> {
    const client = getPrisma();
    const where = buildWhere(filter);
    const counts = async (field: 'colorFamily' | 'leather'): Promise<FacetCount[]> => {
      const rows = await client.product.groupBy({
        by: [field],
        where: { ...where, NOT: { [field]: '' } },
        _count: { _all: true },
      });
      return rows
        .filter((r) => r[field])
        .map((r) => ({ value: r[field] as string, count: r._count._all }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    };

    // a product can have one size in several widths: count each product once
    const variantCounts = async (column: 'size' | 'width'): Promise<FacetCount[]> => {
      const col = Prisma.raw(`v.\`${column}\``);
      const rows = await client.$queryRaw<{ value: string; count: bigint }[]>`
        SELECT ${col} AS value, COUNT(DISTINCT v.productId) AS count
        FROM ProductVariant v JOIN Product p ON p.id = v.productId
        WHERE p.deletedAt IS NULL
          ${filter.category ? Prisma.sql`AND p.category = ${filter.category}` : Prisma.empty}
          ${filter.gender ? Prisma.sql`AND p.gender IN (${filter.gender}, 'unisex')` : Prisma.empty}
          AND ${col} IS NOT NULL AND ${col} <> ''
        GROUP BY ${col}`;
      return rows.map((r) => ({ value: r.value, count: Number(r.count) }));
    };

    const [colors, leathers, sizes, widths, price] = await Promise.all([
      counts('colorFamily'),
      counts('leather'),
      variantCounts('size'),
      variantCounts('width'),
      client.product.aggregate({ where, _min: { price: true }, _max: { price: true } }),
    ]);
    return {
      colors,
      leathers,
      sizes: sizes.sort(compareSizes),
      widths: widths.sort((a, b) => a.value.localeCompare(b.value)),
      price: { min: price._min.price ?? 0, max: price._max.price ?? 0 },
    };
  }

  async listFeatured(limit = 20): Promise<Product[]> {
    const rows = await getPrisma().product.findMany({
      where: { featured: true, ...live },
      orderBy: [{ featuredOrder: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      include: withVariants,
    });
    return rows.map(mapProduct);
  }

  async create(input: CreateProductInput): Promise<Product> {
    const row = await getPrisma().product.create({ data: createData(input), include: withVariants });
    return mapProduct(row);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    return inTransaction(async (tx) => {
      const existing = await tx.product.findFirst({ where: { id, ...live }, select: { id: true } });
      if (!existing) return null;
      const { variants, ...fields } = input;
      const patch = scalarData(fields);
      await tx.product.update({ where: { id }, data: patch });
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productVariant.createMany({
          data: variantRows(variants).map((v) => ({ ...v, productId: id })),
        });
        await syncStock(tx, id);
      }
      const row = await tx.product.findUniqueOrThrow({ where: { id }, include: withVariants });
      return mapProduct(row);
    });
  }

  async softDelete(id: string): Promise<Product | null> {
    const existing = await getPrisma().product.findFirst({ where: { id, ...live }, select: { id: true } });
    if (!existing) return null;
    const row = await getPrisma().product.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: withVariants,
    });
    return mapProduct(row);
  }

  /**
   * One `UPDATE ... WHERE stock >= quantity`: the check and the change are a single
   * atomic statement, so two buyers can never take the last unit twice.
   */
  async decrementStock(productId: string, sku: string, quantity: number): Promise<boolean> {
    return inTransaction(async (tx) => {
      const changed = await tx.$executeRaw`UPDATE ProductVariant v
        JOIN Product p ON p.id = v.productId
        SET v.stock = v.stock - ${quantity}
        WHERE v.productId = ${productId} AND v.sku = ${sku}
          AND v.stock >= ${quantity} AND p.deletedAt IS NULL`;
      if (changed !== 1) return false;
      await syncStock(tx, productId);
      return true;
    });
  }

  async incrementStock(productId: string, sku: string, quantity: number): Promise<void> {
    await inTransaction(async (tx) => {
      await tx.$executeRaw`UPDATE ProductVariant SET stock = stock + ${quantity}
        WHERE productId = ${productId} AND sku = ${sku}`;
      await syncStock(tx, productId);
    });
  }

  async upsertBySlug(slug: string, data: CreateProductInput): Promise<Product> {
    return inTransaction(async (tx) => {
      const key = slug.trim().toLowerCase();
      const existing = await tx.product.findUnique({ where: { slug: key }, select: { id: true } });
      if (!existing) {
        const row = await tx.product.create({ data: createData(data), include: withVariants });
        return mapProduct(row);
      }
      await tx.product.update({
        where: { id: existing.id },
        data: { ...scalarData(data), stock: totalStock(data.variants), deletedAt: null },
      });
      await tx.productVariant.deleteMany({ where: { productId: existing.id } });
      await tx.productVariant.createMany({
        data: variantRows(data.variants).map((v) => ({ ...v, productId: existing.id })),
      });
      await syncStock(tx, existing.id);
      const row = await tx.product.findUniqueOrThrow({ where: { id: existing.id }, include: withVariants });
      return mapProduct(row);
    });
  }

  async setRating(productId: string, avg: number, count: number): Promise<void> {
    await getPrisma().product.updateMany({
      where: { id: productId },
      data: { ratingAvg: avg, ratingCount: count },
    });
  }

  async count(): Promise<number> {
    return getPrisma().product.count({ where: live });
  }

  async countLowStock(threshold: number): Promise<number> {
    return getPrisma().product.count({ where: { ...live, stock: { lte: threshold } } });
  }

  async findLowStock(threshold: number, limit = 50): Promise<Product[]> {
    const rows = await getPrisma().product.findMany({
      where: { ...live, stock: { lte: threshold } },
      orderBy: [{ stock: 'asc' }, { id: 'asc' }],
      take: limit,
      include: withVariants,
    });
    return rows.map(mapProduct);
  }
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
