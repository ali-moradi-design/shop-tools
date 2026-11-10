import type { Router } from 'express';
import cartRoutes from './routes/cart.routes';
import ordersRoutes from './routes/orders.routes';
import paymentsRoutes from './routes/payments.routes';
import { returnsRouter } from '../returns';

export { registerPaymentWebhook } from './routes/payments.routes';

export function registerOrderingRoutes(api: Router): void {
  api.use('/cart', cartRoutes);
  api.use('/orders', ordersRoutes);
  api.use('/payments', paymentsRoutes);
  api.use('/returns', returnsRouter);
}
