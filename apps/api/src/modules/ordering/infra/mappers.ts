import type { Prisma } from '@prisma/client';
import type { Order } from '../domain/order.entity';
import type { Cart } from '../domain/cart.entity';

export type OrderRow = Prisma.OrderGetPayload<{ include: { items: true; history: true } }>;
export type CartRow = Prisma.CartGetPayload<{ include: { items: true } }>;

export function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    user: row.userId,
    items: [...row.items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        product: i.productId,
        sku: i.sku,
        size: i.size,
        width: i.width ?? undefined,
        title: i.title,
        image: i.image ?? undefined,
        price: i.price,
        quantity: i.quantity,
      })),
    subtotalAmount: row.subtotalAmount,
    discountCode: row.discountCode ?? undefined,
    discountAmount: row.discountAmount,
    totalAmount: row.totalAmount,
    status: row.status,
    payment: {
      method: 'fake',
      status: row.paymentStatus,
      paidAt: row.paidAt ?? undefined,
      transactionId: row.transactionId ?? undefined,
    },
    shippingAddress: {
      fullName: row.shippingFullName,
      line1: row.shippingLine1,
      line2: row.shippingLine2 ?? undefined,
      city: row.shippingCity,
      state: row.shippingState ?? undefined,
      postalCode: row.shippingPostalCode,
      country: row.shippingCountry,
    },
    statusHistory: [...row.history]
      .sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id))
      .map((h) => ({ status: h.status, at: h.at, note: h.note ?? undefined })),
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCart(row: CartRow): Cart {
  return {
    id: row.id,
    owner: row.owner,
    items: [...row.items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ productId: i.productId, sku: i.sku, quantity: i.quantity })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
