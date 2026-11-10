import { Router, type NextFunction, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireAnyPermission, requirePermission } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import { asyncHandler } from '@shared/http/asyncHandler';
import { paginate } from '@shared/pagination';
import { parseCsvObjects, toCsv } from '@shared/csv';
import { logger } from '@shared/logging/logger';
import { prisma } from '@shared/infra/prisma/client';
import { createProductSchema, productService } from '@modules/catalog';

/*
 * Admin tools that read across modules: sales insights, CSV export and import, and the
 * activity log of staff changes.
 */

const PAID = ['paid', 'processing', 'shipped', 'completed'];
const dollars = (cents?: number | null) => (cents == null ? '' : (cents / 100).toFixed(2));
const toCents = (v: string) => Math.round(Number(v.replace(/[$,\s]/g, '')) * 100);
const paidSql = Prisma.sql`o.deletedAt IS NULL AND o.status IN (${Prisma.join(PAID)})`;

// ---------- insights ----------

export async function insights(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [totals, byCategory, customers, refunds] = await Promise.all([
    prisma.$queryRaw<{ orders: bigint; revenue: Prisma.Decimal | null }[]>`
      SELECT COUNT(*) AS orders, SUM(o.totalAmount) AS revenue FROM \`Order\` o WHERE ${paidSql} AND o.createdAt >= ${since}`,
    prisma.$queryRaw<{ slug: string | null; name: string | null; revenue: Prisma.Decimal; units: Prisma.Decimal }[]>`
      SELECT c.slug AS slug, c.name AS name, SUM(oi.price * oi.quantity) AS revenue, SUM(oi.quantity) AS units
      FROM OrderItem oi
      JOIN \`Order\` o ON o.id = oi.orderId
      LEFT JOIN Product p ON p.id = oi.productId
      LEFT JOIN Category c ON c.id = p.categoryId
      WHERE ${paidSql} AND o.createdAt >= ${since}
      GROUP BY c.id, c.slug, c.name
      ORDER BY revenue DESC`,
    // customers who bought in the period, and how many of them had bought before it (or twice in it)
    prisma.$queryRaw<{ customers: bigint; returning: Prisma.Decimal | null }[]>`
      SELECT COUNT(*) AS customers, SUM(CASE WHEN t.first < ${since} OR t.inPeriod > 1 THEN 1 ELSE 0 END) AS returning
      FROM (
        SELECT o.userId, MIN(o.createdAt) AS first, SUM(o.createdAt >= ${since}) AS inPeriod
        FROM \`Order\` o WHERE ${paidSql} GROUP BY o.userId
      ) t WHERE t.inPeriod > 0`,
    prisma.order.count({ where: { refundId: { not: null }, updatedAt: { gte: since } } }),
  ]);
  const orders = Number(totals[0]?.orders ?? 0);
  const revenue = Number(totals[0]?.revenue ?? 0);
  const buyers = Number(customers[0]?.customers ?? 0);
  const returning = Number(customers[0]?.returning ?? 0);
  return {
    days,
    revenue,
    orders,
    averageOrderValue: orders ? Math.round(revenue / orders) : 0,
    customers: buyers,
    returningCustomers: returning,
    returningRate: buyers ? returning / buyers : 0,
    refunds,
    byCategory: byCategory.map((r) => ({ category: r.slug ?? 'other', name: r.name ?? 'Other', revenue: Number(r.revenue), units: Number(r.units) })),
  };
}

// ---------- CSV ----------

export const PRODUCT_COLUMNS = [
  'slug', 'title', 'brand', 'model', 'category', 'price', 'compare_at_price', 'description', 'features', 'images', 'options', 'specs', 'tags', 'featured',
];
const split = (v?: string) => (v ? v.split('|').map((s) => s.trim()).filter(Boolean) : []);

/** One option as `SKU / Label / price / BER 4, HAM 2, MUC 0` (price may be empty). */
function optionCell(v: { sku: string; label: string; price: number | null; stock: { quantity: number; warehouse: { code: string } }[] }) {
  return [v.sku, v.label, v.price == null ? '' : dollars(v.price), v.stock.map((s) => `${s.warehouse.code} ${s.quantity}`).join(', ')].join(' / ');
}

async function productsCsv(): Promise<string> {
  const rows = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { slug: 'asc' },
    include: {
      category: { select: { slug: true } },
      variants: { orderBy: { position: 'asc' }, include: { stock: { include: { warehouse: { select: { code: true, sortOrder: true } } } } } },
      specs: { include: { spec: { select: { key: true } } } },
    },
  });
  return toCsv(
    PRODUCT_COLUMNS,
    rows.map((p) => [
      p.slug, p.title, p.brand, p.model, p.category.slug, dollars(p.price), dollars(p.compareAtPrice), p.description,
      ((p.features as string[] | null) ?? []).join(' | '), ((p.images as string[] | null) ?? []).join(' | '),
      // the file can be edited and imported back
      p.variants.map((v) => optionCell({ ...v, stock: [...v.stock].sort((a, b) => a.warehouse.sortOrder - b.warehouse.sortOrder) })).join(' | '),
      p.specs.map((s) => `${s.spec.key}=${s.valueNum ?? s.valueText ?? ''}`).join(' | '),
      ((p.tags as string[] | null) ?? []).join(' | '), p.featured ? 'yes' : '',
    ]),
  );
}

async function ordersCsv(from?: Date, to?: Date): Promise<string> {
  const rows = await prisma.order.findMany({
    where: { deletedAt: null, ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 10_000,
    include: { items: true, user: { select: { email: true } } },
  });
  return toCsv(
    ['order', 'date', 'status', 'customer_email', 'ship_to', 'city', 'country', 'items', 'subtotal', 'discount_code', 'discount', 'total', 'payment', 'transaction', 'carrier', 'tracking'],
    rows.map((o) => [
      `#${o.id.slice(-6).toUpperCase()}`, o.createdAt, o.status, o.user.email, o.shippingFullName, o.shippingCity, o.shippingCountry,
      o.items.map((i) => `${i.quantity}× ${i.title} (${i.label})`).join(' | '),
      dollars(o.subtotalAmount), o.discountCode, dollars(o.discountAmount), dollars(o.totalAmount),
      o.paymentMethod, o.transactionId, o.shipCarrier, o.shipTracking,
    ]),
  );
}

async function customersCsv(): Promise<string> {
  const [users, spend] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, guest: true, isActive: true, createdAt: true } }),
    prisma.order.groupBy({ by: ['userId'], where: { deletedAt: null, status: { in: PAID as never[] } }, _count: { _all: true }, _sum: { totalAmount: true } }),
  ]);
  const byUser = new Map(spend.map((s) => [s.userId, s]));
  return toCsv(
    ['name', 'email', 'guest', 'active', 'joined', 'orders', 'spent'],
    users.map((u) => {
      const s = byUser.get(u.id);
      return [u.name, u.email, u.guest ? 'yes' : '', u.isActive ? 'yes' : 'no', u.createdAt, s?._count._all ?? 0, dollars(s?._sum.totalAmount ?? 0)];
    }),
  );
}

async function subscribersCsv(): Promise<string> {
  const rows = await prisma.subscriber.findMany({ where: { unsubscribedAt: null }, orderBy: { createdAt: 'asc' } });
  return toCsv(['email', 'source', 'subscribed_at'], rows.map((r) => [r.email, r.source, r.createdAt]));
}

/** One CSV row to a product body. Options: `SKU / Label / price / BER 4, HAM 2`; specs: `key=value`. */
function rowToProduct(r: Record<string, string>) {
  const variants = split(r.options).map((entry) => {
    const [sku = '', label = '', price = '', stock = ''] = entry.split(' / ').map((s) => s.trim());
    const levels = Object.fromEntries(
      stock
        .split(',')
        .map((s) => s.trim().split(/\s+/))
        .filter(([code, n]) => code && n !== undefined)
        .map(([code, n]) => [code.toUpperCase(), Number(n)]),
    );
    return { sku, label, ...(price ? { price: toCents(price) } : {}), stock: levels };
  });
  const specs = Object.fromEntries(
    split(r.specs).map((pair) => {
      const [key, ...rest] = pair.split('=');
      const value = rest.join('=').trim();
      return [key.trim(), value !== '' && Number.isFinite(Number(value)) ? Number(value) : value];
    }),
  );
  return {
    slug: r.slug,
    title: r.title,
    ...(r.brand ? { brand: r.brand } : {}),
    ...(r.model ? { model: r.model } : {}),
    category: r.category,
    price: toCents(r.price ?? ''),
    ...(r.compare_at_price ? { compareAtPrice: toCents(r.compare_at_price) } : {}),
    description: r.description ?? '',
    features: split(r.features),
    images: split(r.images),
    variants,
    specs,
    tags: split(r.tags),
    featured: /^(yes|true|1)$/i.test(r.featured ?? ''),
  };
}

export async function importProducts(csv: string, dryRun: boolean) {
  const { header, records } = parseCsvObjects(csv);
  const missing = ['slug', 'title', 'category', 'price', 'options'].filter((c) => !header.includes(c));
  if (missing.length) return { created: 0, updated: 0, errors: [{ row: 1, message: `Missing columns: ${missing.join(', ')}` }], dryRun };
  if (records.length > 1000) return { created: 0, updated: 0, errors: [{ row: 1, message: 'Import at most 1000 rows at a time' }], dryRun };

  const existing = await prisma.product.findMany({ where: { slug: { in: records.map((r) => r.slug.toLowerCase()) } }, select: { id: true, slug: true, deletedAt: true } });
  const bySlug = new Map(existing.map((p) => [p.slug, p]));
  let created = 0;
  let updated = 0;
  const errors: { row: number; slug?: string; message: string }[] = [];

  for (const [i, record] of records.entries()) {
    const row = i + 2; // the header is row 1
    const current = bySlug.get(record.slug.toLowerCase());
    const parsed = createProductSchema.safeParse(rowToProduct(record));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push({ row, slug: record.slug, message: `${issue.path.join('.') || 'row'}: ${issue.message}` });
      continue;
    }
    if (current?.deletedAt) {
      errors.push({ row, slug: record.slug, message: 'This product is in the trash; restore it first' });
      continue;
    }
    if (dryRun) {
      if (current) updated++;
      else created++;
      continue;
    }
    try {
      if (current) {
        // through the service, so restocked options send back-in-stock emails
        await productService.update(current.id, parsed.data);
        updated++;
      } else {
        await productService.create(parsed.data);
        created++;
      }
    } catch (err) {
      errors.push({ row, slug: record.slug, message: err instanceof Error ? err.message : 'Could not save' });
    }
  }
  return { created, updated, errors, dryRun };
}

// ---------- activity log ----------

const STAFF_PERMISSIONS = ['products:update', 'orders:update-status', 'users:update', 'discounts:update', 'roles:update', 'reviews:delete'];
const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ID = '[a-z0-9]{20,40}';

/** What a request did, in words staff can scan. */
export function describe(method: string, path: string, body: Record<string, unknown> | undefined): string {
  const p = path.replace(/^\/api\/v1/, '');
  const id = (p.match(new RegExp(ID)) ?? [''])[0].slice(-6).toUpperCase();
  const verb = method === 'POST' ? 'Created' : method === 'DELETE' ? 'Deleted' : 'Changed';
  const rules: [RegExp, string][] = [
    [new RegExp(`^/products/${ID}/restore$`), `Restored product ${id}`],
    [/^\/products$/, `Created product ${String(body?.slug ?? '')}`],
    [new RegExp(`^/products/${ID}$`), method === 'DELETE' ? `Moved product ${id} to trash` : `Edited product ${id}`],
    [new RegExp(`^/orders/${ID}/status$`), `Set order #${id} to ${String(body?.status ?? '')}`],
    [new RegExp(`^/orders/${ID}/pay$`), `Recorded payment for order #${id}`],
    [new RegExp(`^/orders/${ID}/cancel$`), `Cancelled order #${id}`],
    [new RegExp(`^/returns/${ID}$`), `Set return ${id} to ${String(body?.status ?? '')}`],
    [/^\/discounts/, `${verb} discount ${String(body?.code ?? id)}`],
    [/^\/users/, `${verb} user ${id}${body?.isActive === false ? ' (blocked)' : body?.roles ? ' (roles)' : ''}`],
    [/^\/roles/, `${verb} role ${String(body?.name ?? id)}`],
    [/^\/reviews/, `Removed review ${id}`],
    [/^\/uploads/, 'Uploaded an image'],
    [/^\/admin\/import/, `Imported products from CSV${body?.dryRun === false ? '' : ' (dry run)'}`],
  ];
  return (rules.find(([re]) => re.test(p))?.[1] ?? `${method} ${p}`).trim().slice(0, 300);
}

/**
 * Records successful writes by staff. Runs after the response, so it never slows or
 * fails the request; customers' own actions are not logged.
 */
export function auditTrail(req: Request, res: Response, next: NextFunction): void {
  if (!WRITE.has(req.method)) return next();
  res.on('finish', () => {
    const user = req.user;
    if (!user || res.statusCode >= 400) return;
    if (!user.permissions.some((p) => STAFF_PERMISSIONS.includes(p))) return;
    const path = req.originalUrl.split('?')[0].slice(0, 300);
    if (/^\/api\/v1\/(auth|account|cart|newsletter|returns$)/.test(path)) return;
    prisma.auditEntry
      .create({ data: { actorId: user.id, actorEmail: user.email, method: req.method, path, action: describe(req.method, path, req.body), status: res.statusCode } })
      .catch((err: unknown) => logger.error('audit write failed', { error: String(err) }));
  });
  next();
}

// ---------- routes ----------

export const insightsRouter = Router();
// authenticate per route: this router shares /admin with the dashboard routes

const sendCsv = (res: Response, name: string, csv: string) =>
  res.type('text/csv').attachment(`${name}-${new Date().toISOString().slice(0, 10)}.csv`).send(csv);

insightsRouter.get(
  '/insights',
  authenticate, requireAnyPermission('admin:dashboard', 'reports:analytics'),
  validate({ query: z.object({ days: z.coerce.number().int().min(1).max(365).optional() }) }),
  asyncHandler(async (req, res) => {
    res.json({ data: await insights(Number(req.query.days ?? 30)) });
  }),
);

insightsRouter.get('/export/products.csv', authenticate, requirePermission('products:update'), asyncHandler(async (_req, res) => sendCsv(res, 'products', await productsCsv())));
insightsRouter.get(
  '/export/orders.csv',
  authenticate, requirePermission('orders:read'),
  validate({ query: z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }) }),
  asyncHandler(async (req, res) => sendCsv(res, 'orders', await ordersCsv(req.query.from as Date | undefined, req.query.to as Date | undefined))),
);
insightsRouter.get('/export/customers.csv', authenticate, requirePermission('users:read'), asyncHandler(async (_req, res) => sendCsv(res, 'customers', await customersCsv())));
insightsRouter.get('/export/subscribers.csv', authenticate, requirePermission('users:read'), asyncHandler(async (_req, res) => sendCsv(res, 'subscribers', await subscribersCsv())));

insightsRouter.post(
  '/import/products',
  authenticate, requirePermission('products:create', 'products:update'),
  validate({ body: z.object({ csv: z.string().min(1).max(2_000_000), dryRun: z.boolean().default(true) }) }),
  asyncHandler(async (req, res) => {
    res.json({ data: await importProducts(req.body.csv, req.body.dryRun) });
  }),
);

insightsRouter.get(
  '/audit',
  authenticate, requirePermission('users:read'),
  validate({
    query: z.object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      actor: z.string().min(1).max(40).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(Number(req.query.page ?? 1), Number(req.query.limit ?? 50));
    const where = req.query.actor ? { actorId: String(req.query.actor) } : {};
    const [rows, total] = await Promise.all([
      prisma.auditEntry.findMany({ where, orderBy: [{ at: 'desc' }, { id: 'desc' }], skip, take: limit }),
      prisma.auditEntry.count({ where }),
    ]);
    res.json({
      data: rows.map((r) => ({ id: r.id, actor: r.actorId, actorEmail: r.actorEmail, action: r.action, method: r.method, path: r.path, at: r.at })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);
