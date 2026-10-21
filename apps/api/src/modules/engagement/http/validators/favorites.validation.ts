import { z } from 'zod';

export const addFavoriteSchema = z.object({
  productId: z.string().min(1),
});

export const productIdParamSchema = z.object({ productId: z.string().min(1) });
