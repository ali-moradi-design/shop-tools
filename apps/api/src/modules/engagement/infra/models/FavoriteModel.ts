import { Schema, model, Document, Types } from 'mongoose';

export interface IFavoriteDoc extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavoriteDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const FavoriteModel = model<IFavoriteDoc>('Favorite', favoriteSchema);
