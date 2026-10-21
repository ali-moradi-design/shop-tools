import type { Router } from 'express';
import productsRoutes from './routes/products.routes';
import uploadsRoutes from './routes/uploads.routes';

export function registerCatalogRoutes(api: Router): void {
  api.use('/products', productsRoutes);
  api.use('/uploads', uploadsRoutes);
}
