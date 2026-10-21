import type { Router } from 'express';
import cartRoutes from './routes/cart.routes';
import ordersRoutes from './routes/orders.routes';

export function registerOrderingRoutes(api: Router): void {
  api.use('/cart', cartRoutes);
  api.use('/orders', ordersRoutes);
}
