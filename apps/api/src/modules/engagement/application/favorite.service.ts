import type { IFavoriteRepository } from '@modules/engagement/domain/favorite.repository';
import type { IProductRepository } from '@modules/catalog';
import type { Favorite } from '@modules/engagement/domain/favorite.entity';
import { AppError } from '@shared/errors/AppError';

export class FavoriteService {
  constructor(
    private readonly favorites: IFavoriteRepository,
    private readonly products: IProductRepository,
  ) {}

  async list(userId: string): Promise<Favorite[]> {
    return this.favorites.listByUser(userId, true);
  }

  async add(userId: string, productId: string): Promise<Favorite> {
    const product = await this.products.findById(productId);
    if (!product) throw new AppError('Product not found', 404);

    const existing = await this.favorites.findByUserAndProduct(userId, productId);
    if (existing) throw new AppError('Product already in favorites', 409);

    return this.favorites.create({ userId, productId });
  }

  async remove(userId: string, productId: string): Promise<void> {
    const ok = await this.favorites.deleteByUserAndProduct(userId, productId);
    if (!ok) throw new AppError('Favorite not found', 404);
  }
}
