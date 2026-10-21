import type { ICategoryRepository, IWarehouseRepository } from '@modules/catalog/domain/product.repository';
import type { Category, SpecDefinition, Warehouse } from '@modules/catalog/domain/spec.entity';
import { getPrisma } from '@shared/infra/prisma/client';
import { runInTransaction } from '@shared/infra/prisma/transaction';
import { mapCategory, mapWarehouse } from './mappers';

export class PrismaCategoryRepository implements ICategoryRepository {
  async list(): Promise<Category[]> {
    const rows = await getPrisma().category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { specs: true, _count: { select: { products: { where: { deletedAt: null } } } } },
    });
    return rows.map(mapCategory);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const row = await getPrisma().category.findUnique({ where: { slug }, include: { specs: true } });
    return row ? mapCategory(row) : null;
  }

  async upsert(input: {
    slug: string;
    name: string;
    description?: string;
    sortOrder: number;
    specs: SpecDefinition[];
  }): Promise<Category> {
    return runInTransaction(async (tx) => {
      const category = await tx.category.upsert({
        where: { slug: input.slug },
        create: { slug: input.slug, name: input.name, description: input.description, sortOrder: input.sortOrder },
        update: { name: input.name, description: input.description, sortOrder: input.sortOrder },
      });
      for (const s of input.specs) {
        const data = {
          label: s.label,
          group: s.group,
          kind: s.kind,
          unit: s.unit ?? null,
          unitFamily: s.unitFamily ?? null,
          filterable: s.filterable,
          better: s.better ?? null,
          sortOrder: s.sortOrder,
        };
        await tx.specDefinition.upsert({
          where: { categoryId_key: { categoryId: category.id, key: s.key } },
          create: { categoryId: category.id, key: s.key, ...data },
          update: data,
        });
      }
      const row = await tx.category.findUniqueOrThrow({ where: { id: category.id }, include: { specs: true } });
      return mapCategory(row);
    });
  }
}

export class PrismaWarehouseRepository implements IWarehouseRepository {
  async list(): Promise<Warehouse[]> {
    const rows = await getPrisma().warehouse.findMany({ orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
    return rows.map(mapWarehouse);
  }

  async upsert(input: Warehouse): Promise<Warehouse> {
    const row = await getPrisma().warehouse.upsert({
      where: { code: input.code },
      create: input,
      update: { name: input.name, city: input.city, sortOrder: input.sortOrder },
    });
    return mapWarehouse(row);
  }
}
