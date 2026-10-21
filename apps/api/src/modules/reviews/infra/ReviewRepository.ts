import { Types } from 'mongoose';
import type { IReviewRepository } from '@modules/reviews/domain/review.repository';
import type {
  Review,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListFilter,
} from '@modules/reviews/domain/review.entity';
import { ReviewModel } from './models/ReviewModel';
import { mapReview } from './mappers';
import { paginate } from '@shared/pagination';

export class MongooseReviewRepository implements IReviewRepository {
  async findById(id: string, populate = false): Promise<Review | null> {
    let q = ReviewModel.findById(id);
    if (populate) {
      q = q.populate('user', 'name email').populate('product', 'title slug');
    }
    const doc = await q;
    return doc ? mapReview(doc) : null;
  }

  async list(filter: ReviewListFilter): Promise<{ data: Review[]; total: number }> {
    const { limit, skip } = paginate(filter.page, filter.limit);
    const query: Record<string, unknown> = {};
    if (filter.product) query.product = filter.product;
    if (filter.user) query.user = filter.user;
    const [docs, total] = await Promise.all([
      ReviewModel.find(query)
        // public list: reviewer name only, never the email
        .populate('user', 'name')
        .populate('product', 'title slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReviewModel.countDocuments(query),
    ]);
    return { data: docs.map(mapReview), total };
  }

  async create(input: CreateReviewInput): Promise<Review> {
    const doc = await ReviewModel.create(input);
    return mapReview(doc);
  }

  async update(id: string, input: UpdateReviewInput): Promise<Review | null> {
    const doc = await ReviewModel.findById(id);
    if (!doc) return null;
    if (input.rating !== undefined) doc.rating = input.rating;
    if (input.comment !== undefined) doc.comment = input.comment;
    await doc.save();
    return mapReview(doc);
  }

  async ratingSummary(productId: string): Promise<{ avg: number; count: number }> {
    const [row] = await ReviewModel.aggregate<{ avg: number; count: number }>([
      { $match: { product: new Types.ObjectId(productId), deletedAt: null } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return row ? { avg: Math.round(row.avg * 10) / 10, count: row.count } : { avg: 0, count: 0 };
  }

  async softDelete(id: string): Promise<Review | null> {
    const doc = await ReviewModel.findById(id);
    if (!doc) return null;
    doc.deletedAt = new Date();
    await doc.save();
    return mapReview(doc);
  }
}
