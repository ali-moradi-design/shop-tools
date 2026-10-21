import type { Discount } from '../domain/discount.entity';

function idOf(doc: { id?: string; _id?: { toString(): string } }): string {
  return doc.id ?? doc._id!.toString();
}

export function mapDiscount(doc: {
  id?: string;
  _id?: { toString(): string };
  code: string;
  type: Discount['type'];
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Discount {
  return {
    id: idOf(doc),
    code: doc.code,
    type: doc.type,
    value: doc.value,
    minOrderAmount: doc.minOrderAmount,
    maxUses: doc.maxUses,
    usedCount: doc.usedCount,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
    isActive: doc.isActive,
    deletedAt: doc.deletedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
