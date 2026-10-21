export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface OrderItem {
  product: string;
  sku: string;
  size: string;
  width?: string;
  title: string;
  image?: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
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
