import type { IDiscountRepository } from '@modules/promotions/domain/discount.repository';
import type {
  Discount,
  CreateDiscountInput,
  UpdateDiscountInput,
} from '@modules/promotions/domain/discount.entity';
import { DiscountModel } from './models/DiscountModel';
import { mapDiscount } from './mappers';

export class MongooseDiscountRepository implements IDiscountRepository {
  async findById(id: string): Promise<Discount | null> {
    const doc = await DiscountModel.findById(id);
    return doc ? mapDiscount(doc) : null;
  }

  async findByCode(code: string): Promise<Discount | null> {
    const doc = await DiscountModel.findOne({ code: code.toUpperCase() });
    return doc ? mapDiscount(doc) : null;
  }

  async list(): Promise<Discount[]> {
    const docs = await DiscountModel.find().sort({ createdAt: -1 });
    return docs.map(mapDiscount);
  }

  async create(input: CreateDiscountInput): Promise<Discount> {
    const doc = await DiscountModel.create({
      ...input,
      code: input.code.toUpperCase(),
      usedCount: 0,
      isActive: input.isActive ?? true,
    });
    return mapDiscount(doc);
  }

  async update(id: string, input: UpdateDiscountInput): Promise<Discount | null> {
    const updates: Record<string, unknown> = { ...input };
    if (input.code) updates.code = input.code.toUpperCase();
    const doc = await DiscountModel.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    return doc ? mapDiscount(doc) : null;
  }

  async softDelete(id: string): Promise<Discount | null> {
    const doc = await DiscountModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' },
    );
    return doc ? mapDiscount(doc) : null;
  }

  async incrementUsedCount(id: string): Promise<void> {
    await DiscountModel.updateOne({ _id: id }, { $inc: { usedCount: 1 } });
  }
}
