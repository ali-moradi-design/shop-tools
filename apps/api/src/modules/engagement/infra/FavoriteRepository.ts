import type { IFavoriteRepository } from '@modules/engagement/domain/favorite.repository';
import type { Favorite, CreateFavoriteInput } from '@modules/engagement/domain/favorite.entity';
import { getPrisma } from '@shared/infra/prisma/client';
import { mapFavorite } from './mappers';

const include = { product: true } as const;

export class PrismaFavoriteRepository implements IFavoriteRepository {
  async listByUser(userId: string, populate = true): Promise<Favorite[]> {
    const rows = await getPrisma().favorite.findMany({
      // a favorite of a product that was removed from the shop is not shown
      where: { userId, product: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include,
    });
    return rows.map((r) => mapFavorite(r, populate));
  }

  async findByUserAndProduct(userId: string, productId: string): Promise<Favorite | null> {
    const row = await getPrisma().favorite.findUnique({
      where: { userId_productId: { userId, productId } },
      include,
    });
    return row ? mapFavorite(row, false) : null;
  }

  async create(input: CreateFavoriteInput): Promise<Favorite> {
    const row = await getPrisma().favorite.create({ data: input, include });
    return mapFavorite(row, false);
  }

  async deleteByUserAndProduct(userId: string, productId: string): Promise<boolean> {
    const { count } = await getPrisma().favorite.deleteMany({ where: { userId, productId } });
    return count === 1;
  }
}
