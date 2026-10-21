import type { IFavoriteRepository } from '@modules/engagement/domain/favorite.repository';
import type { Favorite, CreateFavoriteInput } from '@modules/engagement/domain/favorite.entity';
import { FavoriteModel } from './models/FavoriteModel';
import { mapFavorite } from './mappers';

export class MongooseFavoriteRepository implements IFavoriteRepository {
  async listByUser(userId: string, populate = true): Promise<Favorite[]> {
    let q = FavoriteModel.find({ userId }).sort({ createdAt: -1 });
    if (populate) {
      q = q.populate('productId', 'title slug price images');
    }
    const docs = await q;
    return docs.map(mapFavorite);
  }

  async findByUserAndProduct(userId: string, productId: string): Promise<Favorite | null> {
    const doc = await FavoriteModel.findOne({ userId, productId });
    return doc ? mapFavorite(doc) : null;
  }

  async create(input: CreateFavoriteInput): Promise<Favorite> {
    const doc = await FavoriteModel.create({
      userId: input.userId,
      productId: input.productId,
    });
    return mapFavorite(doc);
  }

  async deleteByUserAndProduct(userId: string, productId: string): Promise<boolean> {
    const result = await FavoriteModel.deleteOne({ userId, productId });
    return result.deletedCount === 1;
  }
}
