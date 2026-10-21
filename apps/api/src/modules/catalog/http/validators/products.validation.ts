import { z } from 'zod';
import { PRODUCT_CATEGORIES, PRODUCT_GENDERS } from '../../domain/product.entity';

const imageUrlSchema = z
  .string()
  .min(1)
  .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), {
    message: 'image must be a URL or absolute path starting with /',
  });

const variantSchema = z.object({
  sku: z.string().min(1).max(80),
  size: z.string().min(1).max(20),
  width: z.string().max(20).optional(),
  stock: z.number().int().nonnegative(),
});

export const createProductSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/, 'slug may contain lowercase letters, digits and dashes'),
  title: z.string().min(1).max(200),
  name: z.string().min(1).max(120),
  style: z.string().min(1).max(120),
  color: z.string().min(1).max(80),
  colorFamily: z.string().min(1).max(40),
  colorGroup: z.string().max(80).optional(),
  category: z.enum(PRODUCT_CATEGORIES),
  gender: z.enum(PRODUCT_GENDERS),
  description: z.string().max(5000).default(''),
  features: z.array(z.string().max(200)).max(20).optional(),
  leather: z.string().max(80).optional(),
  construction: z.string().max(80).optional(),
  sole: z.string().max(80).optional(),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  images: z.array(imageUrlSchema).max(20).optional(),
  variants: z.array(variantSchema).min(1).max(40),
  tags: z.array(z.string().max(40)).max(20).optional(),
  featured: z.boolean().optional(),
  featuredOrder: z.number().int().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });
export const slugParamSchema = z.object({ slug: z.string().min(1).max(160) });

const bool = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const facetsQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  gender: z.enum(PRODUCT_GENDERS).optional(),
});

export const listProductsQuerySchema = facetsQuerySchema.extend({
  q: z.string().max(100).optional(),
  style: z.string().max(120).optional(),
  color: z.string().max(80).optional(),
  leather: z.string().max(80).optional(),
  size: z.string().max(20).optional(),
  width: z.string().max(20).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  inStock: bool,
  featured: bool,
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(24),
  sort: z.enum(['featured', 'price', 'title', 'createdAt']).optional().default('featured'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});
