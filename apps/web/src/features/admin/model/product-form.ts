import { z } from 'zod';
import type { SpecDefinition } from '@/entities/category';
import type { Product } from '@/entities/product';

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);

/** Dollars as typed ("129" or "129.5") → cents. */
export const toCents = (dollars: string) => Math.round(Number(dollars) * 100);
export const fromCents = (cents?: number) => (cents === undefined ? '' : (cents / 100).toFixed(2));

/**
 * Photos must be uploads or demo catalog photos: next/image and the CSP only load
 * the shop's own origin, so any other address would break the product page.
 */
export const isAllowedImage = (v: string) => /^\/(uploads\/products|catalog)\/[\w.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(v);

const money = z.string().trim().regex(/^\d{1,6}(\.\d{1,2})?$/, 'Enter an amount like 129.00');
const short = (max: number) => z.string().trim().max(max);

/** The product form, as the admin types it. Empty optional fields are derived. */
export const productFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter a name').max(200),
    brand: short(80),
    model: short(80),
    category: z.string().min(1, 'Choose a category'),
    slug: short(160).regex(/^[a-z0-9-]*$/, 'Use lowercase letters, digits and dashes'),
    description: short(5000),
    features: short(4000),
    /** Spec values by key, as typed; numbers are in the base unit of the definition. */
    specs: z.record(z.string(), short(80)),
    price: money,
    compareAtPrice: money.or(z.literal('')),
    tags: short(800),
    featured: z.boolean(),
    images: z
      .array(z.object({ url: z.string().trim().refine(isAllowedImage, 'Upload the photo') }))
      .max(20, 'Up to 20 photos'),
    variants: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'Name the option').max(80),
          sku: short(80).regex(/^[A-Za-z0-9._-]*$/, 'Letters, digits, dots and dashes'),
          price: money.or(z.literal('')),
          stock: z.record(z.string(), z.number({ error: 'Enter a number' }).int('Whole numbers only').min(0, '0 or more')),
        }),
      )
      .min(1, 'Add at least one option')
      .max(20, 'Up to 20 options'),
  })
  .superRefine((v, ctx) => {
    if (v.compareAtPrice && toCents(v.compareAtPrice) <= toCents(v.price)) {
      ctx.addIssue({ code: 'custom', path: ['compareAtPrice'], message: 'Must be higher than the price' });
    }
    const skus = deriveVariants(v).map((x) => x.sku);
    skus.forEach((sku, i) => {
      if (skus.indexOf(sku) !== i) ctx.addIssue({ code: 'custom', path: ['variants', i, 'sku'], message: 'Each option needs its own SKU' });
    });
  });

export type ProductFormValues = z.input<typeof productFormSchema>;

/** The body the API's POST/PATCH /products expects. Money in cents. */
export interface ProductPayload {
  slug: string;
  title: string;
  brand: string;
  model?: string;
  category: string;
  description: string;
  features: string[];
  specs: Record<string, number | string>;
  price: number;
  /** null clears the sale price on an update. */
  compareAtPrice: number | null;
  images: string[];
  variants: { sku: string; label: string; price?: number; stock: Record<string, number> }[];
  tags: string[];
  featured: boolean;
}

export const deriveSlug = (v: Pick<ProductFormValues, 'slug' | 'title' | 'model'>) =>
  slugify(v.slug || [v.model, v.title].filter(Boolean).join(' '));

function deriveVariants(v: ProductFormValues) {
  const base = (v.model.trim() || deriveSlug(v)).toUpperCase();
  return v.variants.map((x, i) => ({
    label: x.label.trim(),
    sku: (x.sku.trim() || (v.variants.length === 1 ? base : `${base}-${slugify(x.label) || i + 1}`))
      .toUpperCase()
      .replace(/[^A-Z0-9.-]+/g, '-')
      .slice(0, 80),
    price: x.price ? toCents(x.price) : undefined,
    stock: x.stock,
  }));
}

/** Spec values the admin filled in, numbers as numbers. Unknown keys are dropped. */
export function toSpecs(values: Record<string, string>, defs: SpecDefinition[]): { specs: Record<string, number | string>; errors: Record<string, string> } {
  const specs: Record<string, number | string> = {};
  const errors: Record<string, string> = {};
  for (const def of defs) {
    const raw = values[def.key]?.trim();
    if (!raw) continue;
    if (def.kind === 'number') {
      const n = Number(raw.replace(',', '.'));
      if (Number.isFinite(n)) specs[def.key] = n;
      else errors[`specs.${def.key}`] = 'Enter a number';
    } else specs[def.key] = raw;
  }
  return { specs, errors };
}

/** Fills in the derived fields (slug, SKUs) and converts money to cents. */
export function toProductPayload(v: ProductFormValues, defs: SpecDefinition[]): ProductPayload {
  const model = v.model.trim();
  return {
    slug: deriveSlug(v),
    title: v.title.trim(),
    brand: v.brand.trim(),
    ...(model ? { model } : {}),
    category: v.category,
    description: v.description.trim(),
    features: v.features.split('\n').map((f) => f.trim()).filter(Boolean),
    specs: toSpecs(v.specs, defs).specs,
    price: toCents(v.price),
    compareAtPrice: v.compareAtPrice ? toCents(v.compareAtPrice) : null,
    images: v.images.map((i) => i.url.trim()).filter(Boolean),
    variants: deriveVariants(v).map(({ price, ...x }) => (price === undefined ? x : { ...x, price })),
    tags: v.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    featured: v.featured,
  };
}

const emptyStock = (warehouses: string[]) => Object.fromEntries(warehouses.map((w) => [w, 0]));

/** Form defaults: the product being edited, or an empty product. */
export function productToFormValues(p: Product | undefined, warehouses: string[], category = ''): ProductFormValues {
  return {
    title: p?.title ?? '',
    brand: p?.brand ?? 'DEWALT',
    model: p?.model ?? '',
    category: p?.category ?? category,
    slug: p?.slug ?? '',
    description: p?.description ?? '',
    features: p?.features.join('\n') ?? '',
    specs: Object.fromEntries((p?.specs ?? []).map((s) => [s.key, String(s.value)])),
    price: p ? fromCents(p.price) : '',
    compareAtPrice: fromCents(p?.compareAtPrice),
    tags: p?.tags.join(', ') ?? '',
    featured: p?.featured ?? false,
    images: p?.images.map((url) => ({ url })) ?? [],
    variants: p?.variants.map((x) => ({
      label: x.label,
      sku: x.sku,
      price: fromCents(x.price),
      stock: { ...emptyStock(warehouses), ...Object.fromEntries(x.stockByWarehouse.map((s) => [s.warehouse, s.quantity])) },
    })) ?? [{ label: 'Standard', sku: '', price: '', stock: emptyStock(warehouses) }],
  };
}

/** First message per field, keyed by dotted path ("variants.0.sku"). */
export function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'root';
    out[key] ??= issue.message;
  }
  return out;
}
