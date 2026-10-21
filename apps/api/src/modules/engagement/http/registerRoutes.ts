import type { Router } from 'express';
import favoritesRoutes from './routes/favorites.routes';

export function registerEngagementRoutes(api: Router): void {
  api.use('/favorites', favoritesRoutes);
}
