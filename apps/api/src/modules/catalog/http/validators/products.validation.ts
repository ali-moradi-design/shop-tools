import { z } from 'zod';
import { PRODUCT_SORTS } from '../../domain/product.entity';
import { COMPARE_MAX, COMPARE_MIN } from '../../application/product.service';

const slug = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9-]+$/, 'slug may contain lowercase letters, digits and dashes');
const warehouseCode = z.string().regex(/^[A-Z0-9]{2,8}$/, 'warehouse code, e.g. BER');

const imageUrlSchema = z
  .string()
  .min(1)
  .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), {
    message: 'image must be a URL or absolute path starting with /',
  });

const variantSchema = z.object({
  sku: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  price: z.number().int().nonnegative().optional(),
  /** Units per warehouse code, e.g. { "BER": 12, "HAM": 4 }. */
  stock: z.record(warehouseCode, z.number().int().nonnegative()),
});

export const createProductSchema = z.object({
  slug,
  title: z.string().min(1).max(200),
  brand: z.string().max(80).optional(),
  model: z.string().max(80).optional(),
  category: slug,
  description: z.string().max(5000).default(''),
  features: z.array(z.string().max(200)).max(20).optional(),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  images: z.array(imageUrlSchema).max(20).optional(),
  variants: z.array(variantSchema).min(1).max(20),
  /** Specification values by key; numbers in the base unit of the category's definition. */
  specs: z.record(z.string().regex(/^[a-z0-9-]+$/).max(40), z.union([z.number().finite(), z.string().max(80)])).optional(),
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

export const facetsQuerySchema = z.object({ category: slug.optional() });

/**
 * Besides the fixed filters, `spec.<key>=<value>` filters by a specification
 * (see parseSpecFilters for the value syntax); any other unknown parameter is rejected.
 */
export const listProductsQuerySchema = z
  .object({
    q: z.string().max(100).optional(),
    category: slug.optional(),
    warehouse: warehouseCode.optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    inStock: bool,
    featured: bool,
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(24),
    sort: z.enum(PRODUCT_SORTS).optional().default('featured'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
  })
  .catchall(z.string().max(120))
  .superRefine((value, ctx) => {
    for (const key of Object.keys(value)) {
      if (key in listProductsQuerySchema.shape || /^spec\.[a-z0-9-]{1,40}$/.test(key)) continue;
      ctx.addIssue({ code: 'custom', path: [key], message: 'Unknown query parameter' });
    }
  });

/** `?slugs=a,b,c`: two to four different products. */
export const compareQuerySchema = z.object({
  slugs: z
    .string()
    .max(700)
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(slug).min(COMPARE_MIN).max(COMPARE_MAX)),
});

export const categorySlugParamSchema = z.object({ slug });
