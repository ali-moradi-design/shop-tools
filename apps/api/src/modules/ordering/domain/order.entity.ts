export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
  'failed',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  product: string;
  sku: string;
  label: string;
  title: string;
  image?: string;
  price: number;
  quantity: number;
  /** Which warehouses the units came from; known once the order is paid. */
  allocations?: { warehouse: string; quantity: number }[];
}

/** `fake` is the old demo gateway (kept for existing orders); `manual` is staff recording a payment. */
export const PAYMENT_METHODS = ['fake', 'stripe', 'manual'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Payment {
  method: PaymentMethod;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: Date;
  transactionId?: string;
  /** The open Stripe Checkout Session, reused while the customer retries. */
  checkoutSessionId?: string;
}

export const CARRIERS = ['DHL', 'DPD', 'UPS', 'GLS', 'Other'] as const;
export type Carrier = (typeof CARRIERS)[number];

export interface Shipment {
  carrier: Carrier;
  trackingNumber: string;
  shippedAt: Date;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface StatusHistory {
  status: OrderStatus;
  at: Date;
  note?: string;
}

export interface Order {
  id: string;
  user: string;
  items: OrderItem[];
  /** Subtotal before discount */
  subtotalAmount: number;
  discountCode?: string;
  discountAmount: number;
  /** Final amount after discount */
  totalAmount: number;
  status: OrderStatus;
  payment: Payment;
  shipment?: Shipment;
  /** Stripe refund of a cancelled paid order. */
  refundId?: string;
  shippingAddress: ShippingAddress;
  statusHistory: StatusHistory[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
  subtotalAmount: number;
  discountCode?: string;
  discountAmount?: number;
  totalAmount: number;
  shippingAddress: ShippingAddress;
}
