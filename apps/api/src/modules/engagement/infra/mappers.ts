import type { Favorite } from '../domain/favorite.entity';

function idOf(doc: { id?: string; _id?: { toString(): string } }): string {
  return doc.id ?? doc._id!.toString();
}

export function mapFavorite(doc: {
  id?: string;
  _id?: { toString(): string };
  userId: { toString(): string };
  productId: unknown;
  createdAt: Date;
  updatedAt: Date;
}): Favorite {
  const productObj = doc.productId as {
    _id?: { toString(): string };
    id?: string;
    title?: string;
    slug?: string;
    price?: number;
    images?: string[];
    toString?: () => string;
  };
  const productId =
    productObj && typeof productObj === 'object' && (productObj._id || productObj.id)
      ? (productObj.id ?? productObj._id!.toString())
      : String(doc.productId);

  const fav: Favorite = {
    id: idOf(doc),
    userId: doc.userId.toString(),
    productId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (productObj?.title) {
    fav.populated = {
      product: {
        id: productId,
        title: productObj.title,
        slug: productObj.slug ?? '',
        price: productObj.price ?? 0,
        image: productObj.images?.[0],
      },
    };
  }
  return fav;
}
