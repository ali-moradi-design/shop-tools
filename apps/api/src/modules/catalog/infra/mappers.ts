import type { Prisma } from '@prisma/client';
import type { Product, ProductCategory, ProductGender } from '../domain/product.entity';

export type ProductRow = Prisma.ProductGetPayload<{ include: { variants: true } }>;

const strings = (value: Prisma.JsonValue): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    name: row.name,
    style: row.style,
    color: row.color,
    colorFamily: row.colorFamily,
    colorGroup: row.colorGroup ?? undefined,
    category: row.category as ProductCategory,
    gender: row.gender as ProductGender,
    description: row.description,
    features: strings(row.features),
    leather: row.leather ?? undefined,
    construction: row.construction ?? undefined,
    sole: row.sole ?? undefined,
    price: row.price,
    compareAtPrice: row.compareAtPrice ?? undefined,
    currency: row.currency,
    images: strings(row.images),
    variants: [...row.variants]
      .sort((a, b) => a.position - b.position)
      .map((v) => ({ sku: v.sku, size: v.size, width: v.width ?? undefined, stock: v.stock })),
    stock: row.stock,
    tags: strings(row.tags),
    featured: row.featured,
    featuredOrder: row.featuredOrder,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
