import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, registerCustomer, setupTestApp, teardownTestApp, type TestContext } from '../helpers/testApp';

type P = { id: string; slug: string; price: number; compareAtPrice?: number; stock: number };

describe('Admin product tools', () => {
  let ctx: TestContext;
  let admin: { Authorization: string };

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = authHeader(ctx.adminToken);
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  async function anyProduct(): Promise<P> {
    const res = await ctx.request.get('/api/v1/products?limit=1&sort=title').expect(200);
    return res.body.data[0] as P;
  }

  it('filters by maxStock and sorts by stock', async () => {
    const all = await ctx.request.get('/api/v1/products?limit=100&sort=stock&order=asc').expect(200);
    const stocks = (all.body.data as P[]).map((p) => p.stock);
    expect(stocks).toEqual([...stocks].sort((a, b) => a - b));

    const limit = stocks[Math.floor(stocks.length / 2)];
    const low = await ctx.request.get(`/api/v1/products?limit=100&maxStock=${limit}`).expect(200);
    expect(low.body.data.length).toBeGreaterThan(0);
    expect((low.body.data as P[]).every((p) => p.stock <= limit)).toBe(true);

    await ctx.request.get('/api/v1/products?maxStock=-1').expect(400);
  });

  it('starts and ends a sale (compareAtPrice: null clears it)', async () => {
    const p = await anyProduct();
    const sale = await ctx.request
      .patch(`/api/v1/products/${p.id}`)
      .set(admin)
      .send({ price: Math.round(p.price * 0.8), compareAtPrice: p.price })
      .expect(200);
    expect(sale.body.data.compareAtPrice).toBe(p.price);

    const ended = await ctx.request
      .patch(`/api/v1/products/${p.id}`)
      .set(admin)
      .send({ price: p.price, compareAtPrice: null })
      .expect(200);
    expect(ended.body.data.compareAtPrice).toBeUndefined();
    expect(ended.body.data.price).toBe(p.price);
  });

  it('moves a product to the trash and restores it', async () => {
    const p = await anyProduct();
    await ctx.request.delete(`/api/v1/products/${p.id}`).set(admin).expect(200);
    await ctx.request.get(`/api/v1/products/${p.id}`).expect(404);

    const trash = await ctx.request.get('/api/v1/products/trash').set(admin).expect(200);
    expect(trash.body.data[0].id).toBe(p.id);
    expect(trash.body.meta).toMatchObject({ page: 1, limit: 30 });

    const restored = await ctx.request.post(`/api/v1/products/${p.id}/restore`).set(admin).expect(200);
    expect(restored.body.data.id).toBe(p.id);
    await ctx.request.get(`/api/v1/products/${p.id}`).expect(200);

    // restoring a live product is a 404, like deleting a deleted one
    await ctx.request.post(`/api/v1/products/${p.id}/restore`).set(admin).expect(404);
    const after = await ctx.request.get('/api/v1/products/trash').set(admin).expect(200);
    expect((after.body.data as P[]).some((x) => x.id === p.id)).toBe(false);
  });

  it('keeps the trash and restore for staff only', async () => {
    const p = await anyProduct();
    await ctx.request.get('/api/v1/products/trash').expect(401);
    const customer = await registerCustomer(ctx.request);
    await ctx.request.get('/api/v1/products/trash').set(authHeader(customer.accessToken)).expect(403);
    await ctx.request.post(`/api/v1/products/${p.id}/restore`).set(authHeader(customer.accessToken)).expect(403);
  });
});
