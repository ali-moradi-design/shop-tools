import type { IReviewRepository } from '@modules/reviews/domain/review.repository';
import type { IProductRepository } from '@modules/catalog';
import type { ReviewListFilter } from '@modules/reviews/domain/review.entity';
import { AppError } from '@shared/errors/AppError';
import { paginate } from '@shared/pagination';

export class ReviewService {
  constructor(
    private readonly reviews: IReviewRepository,
    private readonly products: IProductRepository,
  ) {}

  async list(filter: ReviewListFilter) {
    const { page, limit } = paginate(filter.page, filter.limit);
    const { data, total } = await this.reviews.list({ ...filter, page, limit });
    return {
      data: data.map((r) => this.toResponse(r)),
      meta: { page, limit, total },
    };
  }

  async getById(id: string) {
    const review = await this.reviews.findById(id, true);
    if (!review) throw new AppError('Review not found', 404);
    return this.toResponse(review);
  }

  async create(input: { product: string; userId: string; rating: number; comment?: string }) {
    const product = await this.products.findById(input.product);
    if (!product) throw new AppError('Product not found', 404);

    const review = await this.reviews.create({
      product: input.product,
      user: input.userId,
      rating: input.rating,
      comment: input.comment,
    });
    await this.syncRating(input.product);
    return this.toResponse(review);
  }

  async update(
    id: string,
    body: { rating?: number; comment?: string },
    requester: { id: string; permissions: string[] },
  ) {
    const review = await this.reviews.findById(id);
    if (!review) throw new AppError('Review not found', 404);

    const isOwn = review.user === requester.id;
    const canUpdateAll = requester.permissions.includes('reviews:update');
    const canUpdateOwn = requester.permissions.includes('reviews:update-own');

    if (!isOwn && !canUpdateAll) throw new AppError('Forbidden', 403);
    if (isOwn && !canUpdateOwn && !canUpdateAll) throw new AppError('Forbidden', 403);

    const updated = await this.reviews.update(id, body);
    await this.syncRating(review.product);
    return this.toResponse(updated!);
  }

  async remove(id: string, requester: { id: string; permissions: string[] }) {
    const review = await this.reviews.findById(id);
    if (!review) throw new AppError('Review not found', 404);

    const isOwn = review.user === requester.id;
    const canDeleteAll = requester.permissions.includes('reviews:delete');
    const canDeleteOwn = requester.permissions.includes('reviews:delete-own');

    if (!isOwn && !canDeleteAll) throw new AppError('Forbidden', 403);
    if (isOwn && !canDeleteOwn && !canDeleteAll) throw new AppError('Forbidden', 403);

    await this.reviews.softDelete(id);
    await this.syncRating(review.product);
  }

  /** Keeps the product's ratingAvg / ratingCount in step with its reviews. */
  private async syncRating(productId: string) {
    const { avg, count } = await this.reviews.ratingSummary(productId);
    await this.products.setRating(productId, avg, count);
  }

  private toResponse(review: {
    id: string;
    product: string;
    user: string;
    rating: number;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
    populated?: {
      user?: { name: string; email: string };
      product?: { title: string; slug: string };
    };
  }) {
    return {
      id: review.id,
      _id: review.id,
      product: review.populated?.product
        ? { _id: review.product, ...review.populated.product }
        : review.product,
      user: review.populated?.user
        ? { _id: review.user, name: review.populated.user.name }
        : review.user,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
