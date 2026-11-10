export const ORDER_STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'failed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Mirrors the API's allowed transitions (order.transitions.ts). */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
  failed: [],
};

/** The number shoppers and staff see: the last six characters of the id. */
export const orderNumber = (id: string) => `#${id.slice(-6).toUpperCase()}`;

export interface OrderItem {
  product: string;
  sku: string;
  label: string;
  title: string;
  image?: string;
  price: number;
  quantity: number;
  /** Which warehouses the units were taken from; known once the order is paid. */
  allocations?: { warehouse: string; quantity: number }[];
}

export interface Order {
  id: string;
  /** Id of the customer's account. */
  user: string;
  items: OrderItem[];
  subtotalAmount: number;
  discountCode?: string;
  discountAmount: number;
  totalAmount: number;
  status: OrderStatus;
  payment: { method: 'fake' | 'stripe' | 'manual'; status: 'pending' | 'paid' | 'failed'; paidAt?: string; transactionId?: string };
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  statusHistory?: { status: OrderStatus; at: string; note?: string }[];
  shipment?: { carrier: string; trackingNumber: string; shippedAt: string; url?: string };
  /** A cancelled paid order whose money went back. */
  refunded?: boolean;
  createdAt: string;
}

export const CARRIERS = ['DHL', 'DPD', 'UPS', 'GLS', 'Other'] as const;

/** Orders can be cancelled until they ship; mirrors the API's canCancel. */
export const canCancel = (s: OrderStatus) => s === 'pending_payment' || s === 'paid' || s === 'processing';

export const RETURN_WINDOW_DAYS = 30;
export const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'received', 'refunded'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Requested — we will look at it shortly',
  approved: 'Approved — please send the items back',
  rejected: 'Not accepted',
  received: 'Received at our warehouse',
  refunded: 'Refunded',
};

export const RETURN_REASONS = [
  ['not-as-described', 'Not as described'],
  ['damaged', 'Arrived damaged'],
  ['defective', 'Does not work'],
  ['wrong-item', 'Wrong item sent'],
  ['changed-mind', 'Changed my mind'],
  ['other', 'Other'],
] as const;

export interface ReturnRequest {
  id: string;
  order: string;
  items: { sku: string; title: string; label: string; quantity: number; price: number }[];
  reason: string;
  comment?: string;
  status: ReturnStatus;
  refundAmount: number;
  refunded: boolean;
  history: { status: ReturnStatus; at: string; note?: string }[];
  createdAt: string;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  completed: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Payment failed',
};
