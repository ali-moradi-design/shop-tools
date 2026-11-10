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
  payment: { method: 'fake'; status: 'pending' | 'paid' | 'failed'; paidAt?: string; transactionId?: string };
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
