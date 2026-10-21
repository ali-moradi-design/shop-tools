import type { Prisma } from '@prisma/client';
import type { Review } from '../domain/review.entity';

export type ReviewRow = Prisma.ReviewGetPayload<{
  include: { user: { select: { name: true; email: true } }; product: { select: { title: true; slug: true } } };
}>;

/** `withEmail` is only for the owner/admin views; the public list shows the name only. */
export function mapReview(row: ReviewRow, populate: boolean, withEmail = false): Review {
  const review: Review = {
    id: row.id,
    product: row.productId,
    user: row.userId,
    rating: row.rating,
    comment: row.comment ?? undefined,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (populate) {
    review.populated = {
      user: { name: row.user.name, email: withEmail ? row.user.email : '' },
      product: { title: row.product.title, slug: row.product.slug },
    };
  }
  return review;
}
