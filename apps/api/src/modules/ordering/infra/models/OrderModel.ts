import { Schema, model, Document, Types, Query } from 'mongoose';
import { ORDER_STATUSES, type OrderStatus } from '@modules/ordering/domain/order.entity';

export interface IOrderItemDoc {
  product: Types.ObjectId;
  sku: string;
  size: string;
  width?: string;
  title: string;
  image?: string;
  price: number;
  quantity: number;
}

export interface IOrderDoc extends Document {
  user: Types.ObjectId;
  items: IOrderItemDoc[];
  subtotalAmount: number;
  discountCode?: string;
  discountAmount: number;
  totalAmount: number;
  status: OrderStatus;
  payment: {
    method: 'fake';
    status: 'pending' | 'paid' | 'failed';
    paidAt?: Date;
    transactionId?: string;
  };
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  statusHistory: { status: OrderStatus; at: Date; note?: string }[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItemDoc>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    size: { type: String, required: true },
    width: { type: String },
    title: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrderDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(v: IOrderItemDoc[]) => v.length > 0, 'Order needs items'],
    },
    subtotalAmount: { type: Number, required: true, min: 0, default: 0 },
    discountCode: { type: String, uppercase: true, trim: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment' },
    payment: {
      method: { type: String, enum: ['fake'], default: 'fake' },
      status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
      paidAt: Date,
      transactionId: String,
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      state: String,
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES, required: true },
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.pre(/^find/, function (this: Query<unknown, IOrderDoc>) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export const OrderModel = model<IOrderDoc>('Order', orderSchema);
