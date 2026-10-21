import type { IDiscountRepository } from '@modules/promotions/domain/discount.repository';
import type {
  Discount,
  CreateDiscountInput,
  UpdateDiscountInput,
} from '@modules/promotions/domain/discount.entity';
import { getPrisma } from '@shared/infra/prisma/client';
import { isNotFound } from '@shared/infra/prisma/errors';
import { mapDiscount } from './mappers';

const live = { deletedAt: null } as const;

export class PrismaDiscountRepository implements IDiscountRepository {
  async findById(id: string): Promise<Discount | null> {
    const row = await getPrisma().discount.findFirst({ where: { id, ...live } });
    return row ? mapDiscount(row) : null;
  }

  async findByCode(code: string): Promise<Discount | null> {
    const row = await getPrisma().discount.findFirst({ where: { code: code.toUpperCase(), ...live } });
    return row ? mapDiscount(row) : null;
  }

  async list(): Promise<Discount[]> {
    const rows = await getPrisma().discount.findMany({
      where: live,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapDiscount);
  }

  async create(input: CreateDiscountInput): Promise<Discount> {
    const row = await getPrisma().discount.create({
      data: {
        ...input,
        code: input.code.trim().toUpperCase(),
        isActive: input.isActive ?? true,
      },
    });
    return mapDiscount(row);
  }

  async update(id: string, input: UpdateDiscountInput): Promise<Discount | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const row = await getPrisma().discount.update({
      where: { id },
      data: { ...input, ...(input.code ? { code: input.code.trim().toUpperCase() } : {}) },
    });
    return mapDiscount(row);
  }

  async softDelete(id: string): Promise<Discount | null> {
    try {
      const row = await getPrisma().discount.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      return mapDiscount(row);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async incrementUsedCount(id: string): Promise<void> {
    await getPrisma().discount.update({ where: { id }, data: { usedCount: { increment: 1 } } });
  }
}
