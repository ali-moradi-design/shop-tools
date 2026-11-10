import { z } from 'zod';
import { CARRIERS, ORDER_STATUSES } from '@modules/ordering/domain/order.entity';

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product: z.string().min(1),
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  shippingAddress: shippingAddressSchema,
  discountCode: z.string().min(1).max(50).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(500).optional(),
  /** Carrier and tracking number, when marking an order shipped. */
  shipment: z.object({ carrier: z.enum(CARRIERS), trackingNumber: z.string().trim().min(4).max(40) }).optional(),
});

export const cancelOrderSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const idParamSchema = z.object({ id: z.string().min(1) });

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});
