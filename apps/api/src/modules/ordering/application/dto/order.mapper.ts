import type { Order } from '@modules/ordering/domain/order.entity';
import { trackingUrl } from '@modules/ordering/domain/rules/tracking';

export interface OrderDto {
  id: string;
  user: string;
  items: Order['items'];
  subtotalAmount: number;
  discountCode?: string;
  discountAmount: number;
  totalAmount: number;
  status: Order['status'];
  /** The Checkout Session id stays internal. */
  payment: Omit<Order['payment'], 'checkoutSessionId'>;
  shipment?: { carrier: string; trackingNumber: string; shippedAt: Date; url?: string };
  /** A cancelled paid order whose money went back. */
  refunded: boolean;
  shippingAddress: Order['shippingAddress'];
  statusHistory: Order['statusHistory'];
  createdAt: Date;
  updatedAt: Date;
}

export function toOrderDto(order: Order): OrderDto {
  return {
    id: order.id,
    user: order.user,
    items: order.items,
    subtotalAmount: order.subtotalAmount,
    discountCode: order.discountCode,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    status: order.status,
    payment: (({ checkoutSessionId: _session, ...rest }) => rest)(order.payment),
    shipment: order.shipment ? { ...order.shipment, url: trackingUrl(order.shipment) } : undefined,
    refunded: Boolean(order.refundId),
    shippingAddress: order.shippingAddress,
    statusHistory: order.statusHistory,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
