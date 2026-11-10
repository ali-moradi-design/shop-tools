import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseCsvObjects } from '../../src/shared/csv';
import { prisma } from '../../src/shared/infra/prisma/client';
import { authHeader, registerCustomer, setupTestApp, shippingAddress, teardownTestApp, type TestContext } from '../helpers/testApp';

const tick = () => new Promise((r) => setTimeout(r, 50));

describe('Admin tools: insights, CSV, activity, roles', () => {
  let ctx: TestContext;
  let admin: { Authorization: string };

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = authHeader(ctx.adminToken);
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  it('insights count paid orders, revenue by category and returning customers', async () => {
    const before = (await ctx.request.get('/api/v1/admin/insights?days=30').set(admin).expect(200)).body.data;
    const c = await registerCustomer(ctx.request);
    const { data } = (await ctx.request.get('/api/v1/products?limit=1&inStock=true&category=drills').expect(200)).body;
    const sku = data[0].variants.find((v: { stock: number }) => v.stock > 0).sku;
    for (let i = 0; i < 2; i++) {
      await ctx.request.post('/api/v1/cart/items').set(authHeader(c.accessToken)).send({ productId: data[0].id, sku, quantity: 1 }).expect(201);
      const order = (await ctx.request.post('/api/v1/cart/checkout').set(authHeader(c.accessToken)).send({ shippingAddress }).expect(201)).body.data;
      await ctx.request.post(`/api/v1/orders/${order.id}/pay`).set(admin).expect(200);
    }
    const after = (await ctx.request.get('/api/v1/admin/insights?days=30').set(admin).expect(200)).body.data;
    expect(after.orders - before.orders).toBe(2);
    expect(after.customers).toBeGreaterThanOrEqual(1);
    expect(after.returningCustomers - before.returningCustomers).toBe(1);
    expect(after.byCategory.find((r: { category: string }) => r.category === 'drills').units).toBeGreaterThanOrEqual(2);
    expect(after.averageOrderValue).toBe(Math.round(after.revenue / after.orders));
    await ctx.request.get('/api/v1/admin/insights').set(authHeader(c.accessToken)).expect(403);
  });

  it('exports products to CSV and imports them back (dry run first, per-row errors)', async () => {
    const res = await ctx.request.get('/api/v1/admin/export/products.csv').set(admin).expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const { header, records } = parseCsvObjects(res.text);
    expect(header).toEqual(expect.arrayContaining(['slug', 'options', 'specs']));
    const row = records.find((r) => r.options.includes(' / '))!;

    // change the price of one product, add a broken row and a new product
    const edited = { ...row, price: '123.45' };
    const fresh = { ...row, slug: `csv-new-${Date.now()}`, title: 'CSV Import Drill', options: `CSV-${Date.now()} / Standard /  / BER 3` };
    const broken = { ...row, slug: 'csv-broken', price: 'abc' };
    const cols = header;
    const line = (r: Record<string, string>) => cols.map((c) => `"${(r[c] ?? '').replace(/"/g, '""')}"`).join(',');
    const csv = [cols.join(','), line(edited), line(fresh), line(broken)].join('\n');

    const dry = (await ctx.request.post('/api/v1/admin/import/products').set(admin).send({ csv }).expect(200)).body.data;
    expect(dry).toMatchObject({ dryRun: true, created: 1, updated: 1 });
    expect(dry.errors).toEqual([expect.objectContaining({ row: 4, slug: 'csv-broken' })]);
    expect((await ctx.request.get(`/api/v1/products/slug/${row.slug}`).expect(200)).body.data.price).not.toBe(12345);

    const real = (await ctx.request.post('/api/v1/admin/import/products').set(admin).send({ csv, dryRun: false }).expect(200)).body.data;
    expect(real).toMatchObject({ dryRun: false, created: 1, updated: 1 });
    expect((await ctx.request.get(`/api/v1/products/slug/${row.slug}`).expect(200)).body.data.price).toBe(12345);
    const created = (await ctx.request.get(`/api/v1/products/slug/${fresh.slug}`).expect(200)).body.data;
    expect(created.warehouses.find((w: { warehouse: string }) => w.warehouse === 'BER').quantity).toBe(3);

    await ctx.request.post('/api/v1/admin/import/products').set(admin).send({ csv: 'slug\nx' }).expect(200);
  });

  it('exports orders, customers and subscribers for staff only', async () => {
    for (const name of ['orders', 'customers', 'subscribers']) {
      const res = await ctx.request.get(`/api/v1/admin/export/${name}.csv`).set(admin).expect(200);
      expect(res.headers['content-disposition']).toContain(`${name}-`);
    }
    const c = await registerCustomer(ctx.request);
    await ctx.request.get('/api/v1/admin/export/customers.csv').set(authHeader(c.accessToken)).expect(403);
  });

  it('logs staff writes in plain words, never customers', async () => {
    const { data } = (await ctx.request.get('/api/v1/products?limit=1').expect(200)).body;
    await ctx.request.patch(`/api/v1/products/${data[0].id}`).set(admin).send({ featured: true }).expect(200);
    const c = await registerCustomer(ctx.request);
    await ctx.request.patch('/api/v1/account').set(authHeader(c.accessToken)).send({ name: 'Not Logged' }).expect(200);
    await tick();
    const log = (await ctx.request.get('/api/v1/admin/audit').set(admin).expect(200)).body;
    expect(log.data[0]).toMatchObject({ actorEmail: 'admin@shop-tools.local', method: 'PATCH' });
    expect(log.data[0].action).toMatch(/^Edited product [A-Z0-9]{6}$/);
    expect(await prisma.auditEntry.count({ where: { actorId: c.userId } })).toBe(0);
  });

  it('protects the built-in admin and customer roles', async () => {
    const roles = (await ctx.request.get('/api/v1/roles').set(admin).expect(200)).body.data as { id: string; name: string }[];
    const adminRole = roles.find((r) => r.name === 'admin')!;
    const customerRole = roles.find((r) => r.name === 'customer')!;
    await ctx.request.delete(`/api/v1/roles/${customerRole.id}`).set(admin).expect(400);
    await ctx.request.patch(`/api/v1/roles/${adminRole.id}`).set(admin).send({ name: 'boss' }).expect(400);
    await ctx.request.patch(`/api/v1/roles/${adminRole.id}`).set(admin).send({ permissions: [] }).expect(400);
  });
});
