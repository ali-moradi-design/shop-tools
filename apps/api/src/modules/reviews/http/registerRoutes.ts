import type { Router } from 'express';
import reviewsRoutes from './routes/reviews.routes';

export function registerReviewsRoutes(api: Router): void {
  api.use('/reviews', reviewsRoutes);
}
