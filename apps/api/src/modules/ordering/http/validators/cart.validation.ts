import { z } from 'zod';
import { shippingAddressSchema } from './orders.validation';

export const addCartItemSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export const lineParamSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(1),
});

export const quoteSchema = z.object({
  discountCode: z.string().min(1).max(50).optional(),
});

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  discountCode: z.string().min(1).max(50).optional(),
});
