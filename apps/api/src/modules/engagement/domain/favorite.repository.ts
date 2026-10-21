import type { Favorite, CreateFavoriteInput } from './favorite.entity';

export interface IFavoriteRepository {
  listByUser(userId: string, populate?: boolean): Promise<Favorite[]>;
  findByUserAndProduct(userId: string, productId: string): Promise<Favorite | null>;
  create(input: CreateFavoriteInput): Promise<Favorite>;
  deleteByUserAndProduct(userId: string, productId: string): Promise<boolean>;
}
