import { Schema, model, Document, Query } from 'mongoose';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_GENDERS,
  type ProductCategory,
  type ProductGender,
  type ProductVariant,
} from '../../domain/product.entity';

export interface IProductDoc extends Document {
  slug: string;
  title: string;
  name: string;
  style: string;
  color: string;
  colorFamily: string;
  colorGroup?: string;
  category: ProductCategory;
  gender: ProductGender;
  description: string;
  features: string[];
  leather?: string;
  construction?: string;
  sole?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  variants: ProductVariant[];
  stock: number;
  tags: string[];
  featured: boolean;
  featuredOrder?: number;
  ratingAvg: number;
  ratingCount: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<ProductVariant>(
  {
    sku: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    width: { type: String, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const productSchema = new Schema<IProductDoc>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    style: { type: String, required: true, trim: true, index: true },
    color: { type: String, required: true, trim: true },
    colorFamily: { type: String, required: true, trim: true },
    colorGroup: { type: String, trim: true },
    category: { type: String, enum: PRODUCT_CATEGORIES, required: true },
    gender: { type: String, enum: PRODUCT_GENDERS, required: true },
    description: { type: String, default: '' },
    features: { type: [String], default: [] },
    leather: { type: String, trim: true },
    construction: { type: String, trim: true },
    sole: { type: String, trim: true },
    // minor units (cents)
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    images: { type: [String], default: [] },
    variants: { type: [variantSchema], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 },
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true },
    featuredOrder: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productSchema.index({ title: 'text', name: 'text', color: 'text', description: 'text' });
productSchema.index({ category: 1, gender: 1, featuredOrder: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'variants.sku': 1 });

productSchema.pre('validate', function () {
  this.stock = this.variants.reduce((sum, v) => sum + v.stock, 0);
});

productSchema.pre(/^find/, function (this: Query<unknown, IProductDoc>) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export const ProductModel = model<IProductDoc>('Product', productSchema);
