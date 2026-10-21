import type { Review } from '../domain/review.entity';

function idOf(doc: { id?: string; _id?: { toString(): string } }): string {
  return doc.id ?? doc._id!.toString();
}

export function mapReview(doc: {
  id?: string;
  _id?: { toString(): string };
  product: unknown;
  user: unknown;
  rating: number;
  comment?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Review {
  const productObj = doc.product as { _id?: { toString(): string }; id?: string; title?: string; slug?: string; toString?: () => string };
  const userObj = doc.user as { _id?: { toString(): string }; id?: string; name?: string; email?: string; toString?: () => string };

  const productId =
    productObj && typeof productObj === 'object' && (productObj._id || productObj.id)
      ? (productObj.id ?? productObj._id!.toString())
      : String(doc.product);
  const userId =
    userObj && typeof userObj === 'object' && (userObj._id || userObj.id)
      ? (userObj.id ?? userObj._id!.toString())
      : String(doc.user);

  const review: Review = {
    id: idOf(doc),
    product: productId,
    user: userId,
    rating: doc.rating,
    comment: doc.comment,
    deletedAt: doc.deletedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (productObj?.title || userObj?.name) {
    review.populated = {};
    if (userObj?.name) {
      review.populated.user = { name: userObj.name, email: userObj.email ?? '' };
    }
    if (productObj?.title) {
      review.populated.product = { title: productObj.title, slug: productObj.slug ?? '' };
    }
  }
  return review;
}
