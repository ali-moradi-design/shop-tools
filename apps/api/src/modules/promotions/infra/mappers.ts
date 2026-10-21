import type { Discount as DiscountRow } from '@prisma/client';
import type { Discount } from '../domain/discount.entity';

export function mapDiscount(row: DiscountRow): Discount {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    minOrderAmount: row.minOrderAmount ?? undefined,
    maxUses: row.maxUses ?? undefined,
    usedCount: row.usedCount,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isActive: row.isActive,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
