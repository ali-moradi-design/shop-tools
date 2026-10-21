import { Schema, model, Document, Types } from 'mongoose';

export interface ICartItemDoc {
  productId: Types.ObjectId;
  sku: string;
  quantity: number;
}

export interface ICartDoc extends Document {
  /** `user:<id>` or `guest:<id>` */
  owner: string;
  items: ICartItemDoc[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItemDoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new Schema<ICartDoc>(
  {
    owner: { type: String, required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

// Guest carts that nobody touched for 30 days are removed by MongoDB.
cartSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 3600, partialFilterExpression: { owner: { $regex: '^guest:' } } },
);

export const CartModel = model<ICartDoc>('Cart', cartSchema);
