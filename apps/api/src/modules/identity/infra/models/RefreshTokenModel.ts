import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshTokenDoc extends Document {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshTokenDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model<IRefreshTokenDoc>('RefreshToken', refreshTokenSchema);
