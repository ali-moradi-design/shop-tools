import { PrismaFavoriteRepository } from './FavoriteRepository';
import { FavoriteService } from '../application/favorite.service';
import { productRepo } from '../../catalog';

export const favoriteRepo = new PrismaFavoriteRepository();
export const favoriteService = new FavoriteService(favoriteRepo, productRepo);
