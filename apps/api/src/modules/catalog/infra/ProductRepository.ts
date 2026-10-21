import { Prisma } from '@prisma/client';
import type { IProductRepository, StockAllocation } from '@modules/catalog/domain/product.repository';
import {
  unitsOf,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
  type ProductListFilter,
  type ProductFacets,
  type SpecFacet,
  type FacetCount,
  type VariantInput,
} from '@modules/catalog/domain';
import { DomainError } from '@shared/domain/DomainError';
import { getPrisma, type PrismaTx } from '@shared/infra/prisma/client';
import { runInTransaction } from '@shared/infra/prisma/transaction';
import { paginate } from '@shared/pagination';
import { mapProduct, mapSpecDefinition, productInclude } from './mappers';

const live = { deletedAt: null } as const;

/** `%`, `_` and `\` mean something inside LIKE; a visitor's search text must not. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, '\\$&');
}

/** `Product.stock` is the sum of every variant in every warehouse; recomputed after each change. */
async function syncStock(tx: PrismaTx, productId: string): Promise<void> {
  await tx.$executeRaw`UPDATE Product
    SET stock = (
      SELECT COALESCE(SUM(sl.quantity), 0)
      FROM StockLevel sl JOIN ProductVariant v ON v.id = sl.variantId
      WHERE v.productId = ${productId})
    WHERE id = ${productId}`;
}

/**
 * Creates or updates the variants of a product and their stock per warehouse, and removes
 * variants that are no longer listed. A SKU can belong to one product only.
 */
async function writeVariants(tx: PrismaTx, productId: string, variants: VariantInput[]): Promise<void> {
  const warehouses = new Map((await tx.warehouse.findMany()).map((w) => [w.code, w.id]));
  for (const [position, v] of variants.entries()) {
    const sku = v.sku.trim();
    const owner = await tx.productVariant.findUnique({ where: { sku }, select: { productId: true } });
    if (owner && owner.productId !== productId) {
      throw new DomainError(`SKU "${sku}" already belongs to another product`, 'CONFLICT');
    }
    const row = await tx.productVariant.upsert({
      where: { sku },
      create: { productId, sku, label: v.label, price: v.price ?? null, position },
      update: { label: v.label, price: v.price ?? null, position },
    });
    await tx.stockLevel.deleteMany({ where: { variantId: row.id } });
    const levels = Object.entries(v.stock).map(([code, quantity]) => {
      const warehouseId = warehouses.get(code);
      if (!warehouseId) throw new DomainError(`Unknown warehouse "${code}"`, 'VALIDATION');
      return { warehouseId, variantId: row.id, quantity };
    });
    if (levels.length) await tx.stockLevel.createMany({ data: levels });
  }
  await tx.productVariant.deleteMany({
    where: { productId, sku: { notIn: variants.map((v) => v.sku.trim()) } },
  });
}

/** Replaces the specification values of a product (keys must exist in its category). */
async function writeSpecs(
  tx: PrismaTx,
  productId: string,
  categoryId: string,
  specs: Record<string, number | string>,
): Promise<void> {
  const defs = new Map((await tx.specDefinition.findMany({ where: { categoryId } })).map((d) => [d.key, d]));
  const rows = Object.entries(specs).map(([key, value]) => {
    const def = defs.get(key);
    if (!def) throw new DomainError(`Unknown specification "${key}" for this category`, 'VALIDATION');
    if (def.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new DomainError(`"${def.label}" must be a number`, 'VALIDATION');
      }
      return { productId, specId: def.id, valueNum: value, valueText: null };
    }
    return { productId, specId: def.id, valueNum: null, valueText: String(value) };
  });
  await tx.productSpec.deleteMany({ where: { productId } });
  if (rows.length) await tx.productSpec.createMany({ data: rows });
}

async function categoryBySlug(tx: PrismaTx, slug: string) {
  const category = await tx.category.findUnique({ where: { slug } });
  if (!category) throw new DomainError(`Unknown category "${slug}"`, 'VALIDATION');
  return category;
}

async function load(tx: PrismaTx, id: string): Promise<Product> {
  return mapProduct(await tx.product.findUniqueOrThrow({ where: { id }, include: productInclude }));
}

async function createIn(tx: PrismaTx, input: CreateProductInput): Promise<Product> {
  const category = await categoryBySlug(tx, input.category);
  const row = await tx.product.create({
    data: {
      slug: input.slug.trim().toLowerCase(),
      title: input.title,
      brand: input.brand ?? '',
      model: input.model ?? null,
      categoryId: category.id,
      description: input.description ?? '',
      features: input.features ?? [],
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      currency: (input.currency ?? 'USD').toUpperCase(),
      images: input.images ?? [],
      tags: input.tags ?? [],
      featured: input.featured ?? false,
      featuredOrder: input.featuredOrder ?? 0,
    },
  });
  await writeVariants(tx, row.id, input.variants);
  await writeSpecs(tx, row.id, category.id, input.specs ?? {});
  await syncStock(tx, row.id);
  return load(tx, row.id);
}

/** Only the fields the caller sent are written. */
async function updateIn(tx: PrismaTx, id: string, input: UpdateProductInput): Promise<Product> {
  const data: Prisma.ProductUncheckedUpdateInput = {};
  if (input.slug !== undefined) data.slug = input.slug.trim().toLowerCase();
  if (input.title !== undefined) data.title = input.title;
  if (input.brand !== undefined) data.brand = input.brand;
  if (input.model !== undefined) data.model = input.model;
  if (input.description !== undefined) data.description = input.description;
  if (input.features !== undefined) data.features = input.features;
  if (input.price !== undefined) data.price = input.price;
  if (input.compareAtPrice !== undefined) data.compareAtPrice = input.compareAtPrice;
  if (input.currency !== undefined) data.currency = input.currency.toUpperCase();
  if (input.images !== undefined) data.images = input.images;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.featured !== undefined) data.featured = input.featured;
  if (input.featuredOrder !== undefined) data.featuredOrder = input.featuredOrder;

  let categoryId: string | undefined;
  if (input.category !== undefined) {
    categoryId = (await categoryBySlug(tx, input.category)).id;
    data.categoryId = categoryId;
  }
  await tx.product.update({ where: { id }, data });

  if (input.variants !== undefined) await writeVariants(tx, id, input.variants);
  // specs are replaced when sent, or dropped when the category changed without new ones
  if (input.specs !== undefined || categoryId !== undefined) {
    const current = categoryId ?? (await tx.product.findUniqueOrThrow({ where: { id }, select: { categoryId: true } })).categoryId;
    await writeSpecs(tx, id, current, input.specs ?? {});
  }
  await syncStock(tx, id);
  return load(tx, id);
}

function buildWhere(filter: ProductListFilter): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  const where: Prisma.ProductWhereInput = { ...live, AND: and };

  if (filter.q) {
    const contains = escapeLike(filter.q);
    and.push({
      OR: [
        { title: { contains } },
        { brand: { contains } },
        { model: { contains } },
        { description: { contains } },
        { variants: { some: { sku: { contains } } } },
      ],
    });
  }
  if (filter.category) where.category = { slug: filter.category };
  for (const spec of filter.specs ?? []) {
    const definition = { key: spec.key, category: { slug: filter.category } };
    and.push({
      specs: {
        some: {
          spec: definition,
          ...(spec.kind === 'range'
            ? { valueNum: { ...(spec.min !== undefined ? { gte: spec.min } : {}), ...(spec.max !== undefined ? { lte: spec.max } : {}) } }
            : { valueText: { in: spec.values } }),
        },
      },
    });
  }
  if (filter.warehouse) {
    and.push({
      variants: { some: { stock: { some: { warehouse: { code: filter.warehouse }, quantity: { gt: 0 } } } } },
    });
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

function buildOrderBy(filter: ProductListFilter): Prisma.ProductOrderByWithRelationInput[] {
  const dir = filter.order === 'desc' ? 'desc' : 'asc';
  switch (filter.sort) {
    case 'price':
      return [{ price: dir }, { id: 'asc' }];
    case 'title':
      return [{ title: dir }, { id: 'asc' }];
    case 'createdAt':
      return [{ createdAt: dir }, { id: 'asc' }];
    case 'stock':
      return [{ stock: dir }, { id: 'asc' }];
    case 'rating':
      return [{ ratingAvg: dir }, { ratingCount: dir }, { id: 'asc' }];
    default:
      return [{ featuredOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }];
  }
}

export class PrismaProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    const row = await getPrisma().product.findFirst({ where: { id, ...live }, include: productInclude });
    return row ? mapProduct(row) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await getPrisma().product.findFirst({
      where: { slug: slug.toLowerCase(), ...live },
      include: productInclude,
    });
    return row ? mapProduct(row) : null;
  }

  /** In the order of `slugs`; unknown slugs are skipped. */
  async findBySlugs(slugs: string[]): Promise<Product[]> {
    const wanted = slugs.map((s) => s.toLowerCase());
    const rows = await getPrisma().product.findMany({
      where: { slug: { in: wanted }, ...live },
      include: productInclude,
    });
    const bySlug = new Map(rows.map((r) => [r.slug, mapProduct(r)]));
    return wanted.flatMap((s) => (bySlug.has(s) ? [bySlug.get(s)!] : []));
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    const rows = await getPrisma().product.findMany({
      where: { id: { in: ids }, ...live },
      include: productInclude,
    });
    return rows.map(mapProduct);
  }

  async list(filter: ProductListFilter): Promise<{ data: Product[]; total: number }> {
    const { limit, skip } = paginate(filter.page, filter.limit);
    const where = buildWhere(filter);
    const client = getPrisma();
    const [rows, total] = await Promise.all([
      client.product.findMany({ where, orderBy: buildOrderBy(filter), skip, take: limit, include: productInclude }),
      client.product.count({ where }),
    ]);
    return { data: rows.map(mapProduct), total };
  }

  async facets(filter: { category?: string }): Promise<ProductFacets> {
    const client = getPrisma();
    const category = filter.category
      ? await client.category.findUnique({ where: { slug: filter.category }, include: { specs: true } })
      : null;
    const productWhere: Prisma.ProductWhereInput = { ...live, ...(category ? { categoryId: category.id } : {}) };

    const specFacets: SpecFacet[] = [];
    for (const row of [...(category?.specs ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (!row.filterable) continue;
      const def = mapSpecDefinition(row);
      const base: SpecFacet = {
        key: def.key,
        label: def.label,
        group: def.group,
        kind: def.kind,
        unit: def.unit,
        units: unitsOf(def.unitFamily).length ? unitsOf(def.unitFamily) : def.unit ? [{ symbol: def.unit, factor: 1 }] : [],
        better: def.better,
      };
      if (def.kind === 'number') {
        const agg = await client.productSpec.aggregate({
          where: { specId: row.id, product: productWhere, valueNum: { not: null } },
          _min: { valueNum: true },
          _max: { valueNum: true },
        });
        if (agg._min.valueNum === null) continue;
        specFacets.push({ ...base, min: agg._min.valueNum, max: agg._max.valueNum ?? agg._min.valueNum });
      } else {
        const groups = await client.productSpec.groupBy({
          by: ['valueText'],
          where: { specId: row.id, product: productWhere, valueText: { not: null } },
          _count: { _all: true },
        });
        const options: FacetCount[] = groups
          .map((g) => ({ value: g.valueText as string, count: g._count._all }))
          .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
        if (options.length) specFacets.push({ ...base, options });
      }
    }

    const price = await client.product.aggregate({ where: productWhere, _min: { price: true }, _max: { price: true } });
    const warehouses = await client.$queryRaw<{ code: string; name: string; count: bigint }[]>`
      SELECT w.code AS code, w.name AS name, COUNT(DISTINCT p.id) AS count
      FROM Warehouse w
      LEFT JOIN StockLevel sl ON sl.warehouseId = w.id AND sl.quantity > 0
      LEFT JOIN ProductVariant v ON v.id = sl.variantId
      LEFT JOIN Product p ON p.id = v.productId AND p.deletedAt IS NULL
        ${category ? Prisma.sql`AND p.categoryId = ${category.id}` : Prisma.empty}
      GROUP BY w.id, w.code, w.name, w.sortOrder
      ORDER BY w.sortOrder, w.code`;

    return {
      price: { min: price._min.price ?? 0, max: price._max.price ?? 0 },
      specs: specFacets,
      warehouses: warehouses.map((w) => ({ code: w.code, name: w.name, count: Number(w.count) })),
    };
  }

  async listFeatured(limit = 20): Promise<Product[]> {
    const rows = await getPrisma().product.findMany({
      where: { featured: true, ...live },
      orderBy: [{ featuredOrder: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      include: productInclude,
    });
    return rows.map(mapProduct);
  }

  create(input: CreateProductInput): Promise<Product> {
    return runInTransaction((tx) => createIn(tx, input));
  }

  update(id: string, input: UpdateProductInput): Promise<Product | null> {
    return runInTransaction(async (tx) => {
      const existing = await tx.product.findFirst({ where: { id, ...live }, select: { id: true } });
      return existing ? updateIn(tx, id, input) : null;
    });
  }

  async softDelete(id: string): Promise<Product | null> {
    return runInTransaction(async (tx) => {
      const existing = await tx.product.findFirst({ where: { id, ...live }, select: { id: true } });
      if (!existing) return null;
      await tx.product.update({ where: { id }, data: { deletedAt: new Date() } });
      return load(tx, id);
    });
  }

  /**
   * Locks the stock rows of the variant (`FOR UPDATE`), then takes units from the warehouses
   * in dispatch order. Two buyers of the last unit queue up on the lock: the second one
   * sees zero and gets `null`. Nothing is written unless the whole quantity is available.
   */
  decrementStock(productId: string, sku: string, quantity: number): Promise<StockAllocation[] | null> {
    return runInTransaction(async (tx) => {
      const levels = await tx.$queryRaw<{ warehouseId: string; variantId: string; quantity: number; code: string }[]>`
        SELECT sl.warehouseId AS warehouseId, sl.variantId AS variantId, sl.quantity AS quantity, w.code AS code
        FROM StockLevel sl
        JOIN ProductVariant v ON v.id = sl.variantId
        JOIN Warehouse w ON w.id = sl.warehouseId
        JOIN Product p ON p.id = v.productId
        WHERE v.productId = ${productId} AND v.sku = ${sku} AND p.deletedAt IS NULL AND sl.quantity > 0
        ORDER BY w.sortOrder, w.code
        FOR UPDATE OF sl`;

      let remaining = quantity;
      const taken: { warehouseId: string; variantId: string; code: string; quantity: number }[] = [];
      for (const level of levels) {
        if (remaining === 0) break;
        const take = Math.min(level.quantity, remaining);
        taken.push({ ...level, quantity: take });
        remaining -= take;
      }
      if (remaining > 0) return null;

      for (const t of taken) {
        await tx.stockLevel.update({
          where: { warehouseId_variantId: { warehouseId: t.warehouseId, variantId: t.variantId } },
          data: { quantity: { decrement: t.quantity } },
        });
      }
      await syncStock(tx, productId);
      return taken.map((t) => ({ warehouse: t.code, quantity: t.quantity }));
    });
  }

  incrementStock(productId: string, sku: string, quantity: number, warehouse?: string): Promise<void> {
    return runInTransaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({ where: { productId, sku }, select: { id: true } });
      if (!variant) return;
      const target = warehouse
        ? await tx.warehouse.findUnique({ where: { code: warehouse } })
        : await tx.warehouse.findFirst({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
      if (!target) return;
      await tx.stockLevel.upsert({
        where: { warehouseId_variantId: { warehouseId: target.id, variantId: variant.id } },
        create: { warehouseId: target.id, variantId: variant.id, quantity },
        update: { quantity: { increment: quantity } },
      });
      await syncStock(tx, productId);
    });
  }

  upsertBySlug(slug: string, data: CreateProductInput): Promise<Product> {
    return runInTransaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { slug: slug.trim().toLowerCase() }, select: { id: true } });
      if (!existing) return createIn(tx, data);
      await tx.product.update({ where: { id: existing.id }, data: { deletedAt: null } });
      return updateIn(tx, existing.id, data);
    });
  }

  async setRating(productId: string, avg: number, count: number): Promise<void> {
    await getPrisma().product.updateMany({ where: { id: productId }, data: { ratingAvg: avg, ratingCount: count } });
  }

  count(): Promise<number> {
    return getPrisma().product.count({ where: live });
  }

  countLowStock(threshold: number): Promise<number> {
    return getPrisma().product.count({ where: { ...live, stock: { lte: threshold } } });
  }

  async findLowStock(threshold: number, limit = 50): Promise<Product[]> {
    const rows = await getPrisma().product.findMany({
      where: { ...live, stock: { lte: threshold } },
      orderBy: [{ stock: 'asc' }, { id: 'asc' }],
      take: limit,
      include: productInclude,
    });
    return rows.map(mapProduct);
  }
}
