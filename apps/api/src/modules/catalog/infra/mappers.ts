import type { Prisma, SpecDefinition as SpecRow, Category as CategoryRow, Warehouse as WarehouseRow } from '@prisma/client';
import type { Product, WarehouseStock } from '../domain/product.entity';
import type { Category, SpecDefinition, Warehouse, ProductSpecValue } from '../domain/spec.entity';

/** What a product needs to be shown: category, variants with stock per warehouse, specs. */
export const productInclude = {
  category: true,
  variants: { include: { stock: { include: { warehouse: true } } } },
  specs: { include: { spec: true } },
} satisfies Prisma.ProductInclude;

export type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const strings = (value: Prisma.JsonValue): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

export function mapSpecDefinition(row: SpecRow): SpecDefinition {
  return {
    key: row.key,
    label: row.label,
    group: row.group,
    kind: row.kind,
    unit: row.unit ?? undefined,
    unitFamily: row.unitFamily ?? undefined,
    filterable: row.filterable,
    better: row.better === 'higher' || row.better === 'lower' ? row.better : undefined,
    sortOrder: row.sortOrder,
  };
}

export function mapCategory(row: CategoryRow & { specs?: SpecRow[]; _count?: { products: number } }): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sortOrder,
    productCount: row._count?.products,
    specs: [...(row.specs ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map(mapSpecDefinition),
  };
}

export function mapWarehouse(row: WarehouseRow): Warehouse {
  return { code: row.code, name: row.name, city: row.city, sortOrder: row.sortOrder };
}

export function mapProduct(row: ProductRow): Product {
  const perWarehouse = new Map<string, { quantity: number; order: number }>();
  const variants = [...row.variants]
    .sort((a, b) => a.position - b.position)
    .map((v) => {
      const levels = [...v.stock].sort(
        (a, b) => a.warehouse.sortOrder - b.warehouse.sortOrder || a.warehouse.code.localeCompare(b.warehouse.code),
      );
      for (const l of levels) {
        const seen = perWarehouse.get(l.warehouse.code);
        perWarehouse.set(l.warehouse.code, {
          quantity: (seen?.quantity ?? 0) + l.quantity,
          order: l.warehouse.sortOrder,
        });
      }
      return {
        sku: v.sku,
        label: v.label,
        price: v.price ?? undefined,
        stock: levels.reduce((sum, l) => sum + l.quantity, 0),
        stockByWarehouse: levels.map((l): WarehouseStock => ({ warehouse: l.warehouse.code, quantity: l.quantity })),
      };
    });

  const specs: ProductSpecValue[] = [...row.specs]
    .sort((a, b) => a.spec.sortOrder - b.spec.sortOrder)
    .flatMap((s) => {
      const value = s.spec.kind === 'number' ? s.valueNum : s.valueText;
      if (value === null || value === undefined) return [];
      return [
        {
          key: s.spec.key,
          label: s.spec.label,
          group: s.spec.group,
          kind: s.spec.kind,
          unit: s.spec.unit ?? undefined,
          unitFamily: s.spec.unitFamily ?? undefined,
          value,
        },
      ];
    });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    model: row.model ?? undefined,
    category: row.category.slug,
    categoryName: row.category.name,
    description: row.description,
    features: strings(row.features),
    price: row.price,
    compareAtPrice: row.compareAtPrice ?? undefined,
    currency: row.currency,
    images: strings(row.images),
    variants,
    stock: row.stock,
    warehouses: [...perWarehouse.entries()]
      .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
      .map(([warehouse, v]) => ({ warehouse, quantity: v.quantity })),
    specs,
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
