import type { Prisma } from '@prisma/client';
import type { Favorite } from '../domain/favorite.entity';

export type FavoriteRow = Prisma.FavoriteGetPayload<{ include: { product: true } }>;

export function mapFavorite(row: FavoriteRow, populate: boolean): Favorite {
  const images = Array.isArray(row.product.images) ? (row.product.images as unknown[]) : [];
  const fav: Favorite = {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (populate) {
    fav.populated = {
      product: {
        id: row.productId,
        title: row.product.title,
        slug: row.product.slug,
        price: row.product.price,
        image: typeof images[0] === 'string' ? images[0] : undefined,
      },
    };
  }
  return fav;
}
