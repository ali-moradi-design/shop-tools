import type { Router } from 'express';
import discountsRoutes from './routes/discounts.routes';

export function registerPromotionsRoutes(api: Router): void {
  api.use('/discounts', discountsRoutes);
}
