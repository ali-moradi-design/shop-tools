import type { Order, OrderItem } from '../domain/order.entity';
import type { Cart } from '../domain/cart.entity';

function idOf(doc: { id?: string; _id?: { toString(): string } }): string {
  return doc.id ?? doc._id!.toString();
}

export function mapOrder(doc: {
  id?: string;
  _id?: { toString(): string };
  user: { toString(): string };
  items: {
    product: { toString(): string };
    sku: string;
    size: string;
    width?: string;
    title: string;
    image?: string;
    price: number;
    quantity: number;
  }[];
  subtotalAmount?: number;
  discountCode?: string;
  discountAmount?: number;
  totalAmount: number;
  status: Order['status'];
  payment: Order['payment'];
  shippingAddress: Order['shippingAddress'];
  statusHistory: Order['statusHistory'];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Order {
  const items: OrderItem[] = doc.items.map((i) => ({
    product: i.product.toString(),
    sku: i.sku,
    size: i.size,
    width: i.width,
    title: i.title,
    image: i.image,
    price: i.price,
    quantity: i.quantity,
  }));
  const discountAmount = doc.discountAmount ?? 0;
  const subtotalAmount = doc.subtotalAmount ?? doc.totalAmount + discountAmount;
  return {
    id: idOf(doc),
    user: doc.user.toString(),
    items,
    subtotalAmount,
    discountCode: doc.discountCode,
    discountAmount,
    totalAmount: doc.totalAmount,
    status: doc.status,
    payment: doc.payment,
    shippingAddress: doc.shippingAddress,
    statusHistory: doc.statusHistory,
    deletedAt: doc.deletedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapCart(doc: {
  id?: string;
  _id?: { toString(): string };
  owner: string;
  items: { productId: { toString(): string }; sku: string; quantity: number }[];
  createdAt: Date;
  updatedAt: Date;
}): Cart {
  return {
    id: idOf(doc),
    owner: doc.owner,
    items: doc.items.map((i) => ({
      productId: i.productId.toString(),
      sku: i.sku,
      quantity: i.quantity,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
