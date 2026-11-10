import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { optionalAuthenticate } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import { asyncHandler } from '@shared/http/asyncHandler';
import { AppError } from '@shared/errors/AppError';
import { env } from '@shared/config/env';
import { prisma } from '@shared/infra/prisma/client';
import { mailer } from '@modules/messaging/mailer';
import { templates } from '@modules/messaging/templates';

/* Back-in-stock alerts and search suggestions. */

const like = (s: string) => s.replace(/[\\%_]/g, '\\$&');
const openKey = (productId: string, sku: string, email: string) => `${productId}|${sku}|${email}`;

/** Units of one option across every warehouse. */
async function variantStock(productId: string, sku: string): Promise<number | null> {
  const v = await prisma.productVariant.findFirst({ where: { productId, sku }, select: { stock: { select: { quantity: true } } } });
  return v ? v.stock.reduce((n, s) => n + s.quantity, 0) : null;
}

/** Emails everyone waiting for these options, once. */
export async function notifyBackInStock(productId: string, skus: string[]): Promise<number> {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { title: true, slug: true } });
  if (!product) return 0;
  const alerts = await prisma.stockAlert.findMany({ where: { productId, sku: { in: skus }, notifiedAt: null } });
  let sent = 0;
  for (const a of alerts) {
    const variant = await prisma.productVariant.findFirst({ where: { productId, sku: a.sku }, select: { label: true } });
    if (!variant || ((await variantStock(productId, a.sku)) ?? 0) <= 0) continue;
    // claim first, so two restocks at once cannot send the email twice
    const { count } = await prisma.stockAlert.updateMany({ where: { id: a.id, notifiedAt: null }, data: { notifiedAt: new Date(), openKey: null } });
    if (count === 0) continue;
    await mailer.send({ to: a.email, template: 'back-in-stock', ...templates.backInStock({ title: product.title, slug: product.slug, option: variant.label }) });
    sent++;
  }
  return sent;
}

const alertLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const catalogExtrasRouter = Router();

/** GET /products/suggest?q= — a few matches for the search box, cheap enough to call per keystroke. */
catalogExtrasRouter.get(
  '/suggest',
  validate({ query: z.object({ q: z.string().trim().min(2).max(60) }) }),
  asyncHandler(async (req, res) => {
    const q = like(String(req.query.q));
    // from the start of the title or of any word in it, or the start of the model or a SKU
    const rows = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { startsWith: q } },
          { title: { contains: ` ${q}` } },
          { model: { startsWith: q } },
          { variants: { some: { sku: { startsWith: q } } } },
        ],
      },
      orderBy: [{ featured: 'desc' }, { ratingCount: 'desc' }, { id: 'asc' }],
      take: 6,
      select: { id: true, title: true, slug: true, model: true, images: true, price: true, compareAtPrice: true, stock: true, category: { select: { name: true } } },
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      data: rows.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        model: p.model ?? undefined,
        category: p.category.name,
        image: (p.images as string[] | null)?.[0],
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? undefined,
        inStock: p.stock > 0,
      })),
    });
  }),
);

/** POST /products/:id/stock-alerts — "email me when this option is back". */
catalogExtrasRouter.post(
  '/:id/stock-alerts',
  alertLimiter,
  optionalAuthenticate,
  validate({
    params: z.object({ id: z.string().min(1).max(40) }),
    body: z.object({ sku: z.string().min(1).max(80), email: z.string().trim().email().max(200).optional() }),
  }),
  asyncHandler(async (req, res) => {
    const email = (req.body.email ?? req.user?.email)?.toLowerCase();
    if (!email) throw new AppError('Enter your email', 400);
    const productId = String(req.params.id);
    const live = await prisma.product.count({ where: { id: productId, deletedAt: null } });
    const stock = live ? await variantStock(productId, req.body.sku) : null;
    if (stock === null) throw new AppError('Option not found', 404);
    if (stock > 0) throw new AppError('This option is in stock now', 409);
    const key = openKey(productId, req.body.sku, email);
    await prisma.stockAlert.upsert({ where: { openKey: key }, create: { productId, sku: req.body.sku, email, openKey: key }, update: {} });
    res.status(201).json({ message: 'We will email you when it is back.' });
  }),
);
