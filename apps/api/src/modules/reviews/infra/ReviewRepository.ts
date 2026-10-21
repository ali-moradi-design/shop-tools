import type { IReviewRepository } from '@modules/reviews/domain/review.repository';
import type {
  Review,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListFilter,
} from '@modules/reviews/domain/review.entity';
import { getPrisma } from '@shared/infra/prisma/client';
import { isNotFound } from '@shared/infra/prisma/errors';
import { paginate } from '@shared/pagination';
import { mapReview } from './mappers';

const include = {
  user: { select: { name: true, email: true } },
  product: { select: { title: true, slug: true } },
} as const;
const live = { deletedAt: null } as const;

export class PrismaReviewRepository implements IReviewRepository {
  async findById(id: string, populate = false): Promise<Review | null> {
    const row = await getPrisma().review.findFirst({ where: { id, ...live }, include });
    return row ? mapReview(row, populate, true) : null;
  }

  async list(filter: ReviewListFilter): Promise<{ data: Review[]; total: number }> {
    const { limit, skip } = paginate(filter.page, filter.limit);
    const where = {
      ...live,
      ...(filter.product ? { productId: filter.product } : {}),
      ...(filter.user ? { userId: filter.user } : {}),
    };
    const client = getPrisma();
    const [rows, total] = await Promise.all([
      client.review.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      client.review.count({ where }),
    ]);
    // public list: reviewer name only, never the email
    return { data: rows.map((r) => mapReview(r, true, false)), total };
  }

  async create(input: CreateReviewInput): Promise<Review> {
    const row = await getPrisma().review.create({
      data: {
        productId: input.product,
        userId: input.user,
        rating: input.rating,
        comment: input.comment,
      },
      include,
    });
    return mapReview(row, false);
  }

  async update(id: string, input: UpdateReviewInput): Promise<Review | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const row = await getPrisma().review.update({
      where: { id },
      data: { rating: input.rating, comment: input.comment },
      include,
    });
    return mapReview(row, false);
  }

  async ratingSummary(productId: string): Promise<{ avg: number; count: number }> {
    const agg = await getPrisma().review.aggregate({
      where: { productId, ...live },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const avg = agg._avg.rating ?? 0;
    return { avg: Math.round(avg * 10) / 10, count: agg._count._all };
  }

  async softDelete(id: string): Promise<Review | null> {
    try {
      const row = await getPrisma().review.update({
        where: { id },
        data: { deletedAt: new Date() },
        include,
      });
      return mapReview(row, false);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }
}
