import type { Router } from 'express';
import productsRoutes from './routes/products.routes';
import uploadsRoutes from './routes/uploads.routes';
import { categoriesRouter, warehousesRouter } from './routes/categories.routes';

export function registerCatalogRoutes(api: Router): void {
  api.use('/products', productsRoutes);
  api.use('/categories', categoriesRouter);
  api.use('/warehouses', warehousesRouter);
  api.use('/uploads', uploadsRoutes);
}
