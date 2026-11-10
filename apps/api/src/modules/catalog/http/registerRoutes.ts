import type { Router } from 'express';
import productsRoutes from './routes/products.routes';
import uploadsRoutes from './routes/uploads.routes';
import { categoriesRouter, warehousesRouter } from './routes/categories.routes';
import { catalogExtrasRouter } from '../extras';

export function registerCatalogRoutes(api: Router): void {
  // before the products router, so /products/suggest is not read as a product id
  api.use('/products', catalogExtrasRouter);
  api.use('/products', productsRoutes);
  api.use('/categories', categoriesRouter);
  api.use('/warehouses', warehousesRouter);
  api.use('/uploads', uploadsRoutes);
}
