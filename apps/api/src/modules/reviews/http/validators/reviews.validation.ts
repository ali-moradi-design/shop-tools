import { z } from 'zod';

export const createReviewSchema = z.object({
  product: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listReviewsQuerySchema = z.object({
  product: z.string().optional(),
  user: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
