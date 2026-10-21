import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  authHeader,
  registerCustomer,
  setupTestApp,
  shippingAddress,
  teardownTestApp,
  type TestContext,
} from '../helpers/testApp';
import { repos } from '../../src/shared/composition/repos';
import { prisma } from '../../src/shared/infra/prisma/client';

const input = (slug: string, sku: string, stock: number) => ({
  slug,
  title: `${slug} | Black`,
  name: slug,
  style: slug,
  color: 'Black',
  colorFamily: 'Black',
  category: 'boots' as const,
  gender: 'men' as const,
  description: 'MySQL behaviour test',
  price: 1000,
  variants: [{ sku, size: '10', stock }],
});

describe('MySQL behaviours', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  it('treats % and _ in a search as plain text', async () => {
    for (const q of ['%', '_', '\\']) {
      const res = await ctx.request.get('/api/v1/products').query({ q }).expect(200);
      expect(res.body.data).toHaveLength(0);
    }
  });

  it('hands validated, typed query values to the repository', async () => {
    // "featured=true" and "limit=2" arrive as strings; the schema turns them into a
    // boolean and a number before the database sees them
    const res = await ctx.request.get('/api/v1/products').query({ featured: 'true', limit: '2' }).expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.data.every((p: { featured: boolean }) => p.featured)).toBe(true);
    await ctx.request.get('/api/v1/products').query({ limit: '1000' }).expect(400);
    await ctx.request.get('/api/v1/products').query({ featured: 'maybe' }).expect(400);
  });

  it('is not fooled by SQL in a search', async () => {
    const res = await ctx.request
      .get('/api/v1/products')
      .query({ q: "' OR 1=1 -- " })
      .expect(200);
    expect(res.body.data).toHaveLength(0);
    // the table is still there
    expect(await repos.products.count()).toBeGreaterThan(0);
  });

  it('lets only one of two parallel buyers take the last unit', async () => {
    const product = await repos.products.create(input('race-last-unit', 'RACE-1', 1));
    const results = await Promise.all([
      repos.products.decrementStock(product.id, 'RACE-1', 1),
      repos.products.decrementStock(product.id, 'RACE-1', 1),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const after = await repos.products.findById(product.id);
    expect(after?.stock).toBe(0);
    expect(after?.variants[0].stock).toBe(0);
  });

  it('rolls the whole payment back when one line is out of stock', async () => {
    const a = await repos.products.create(input('atomic-a', 'ATOM-A', 5));
    const b = await repos.products.create(input('atomic-b', 'ATOM-B', 1));

    const buy = async (token: string, lines: { id: string; sku: string }[]) => {
      for (const l of lines) {
        await ctx.request
          .post('/api/v1/cart/items')
          .set(authHeader(token))
          .send({ productId: l.id, sku: l.sku, quantity: 1 })
          .expect(201);
      }
      const res = await ctx.request
        .post('/api/v1/cart/checkout')
        .set(authHeader(token))
        .send({ shippingAddress })
        .expect(201);
      return res.body.data.id as string;
    };

    const x = await registerCustomer(ctx.request, `atom_x_${Date.now()}`);
    const y = await registerCustomer(ctx.request, `atom_y_${Date.now()}`);
    // x orders A then B; y orders B only and pays first, so B is gone when x pays
    const orderX = await buy(x.accessToken, [
      { id: a.id, sku: 'ATOM-A' },
      { id: b.id, sku: 'ATOM-B' },
    ]);
    const orderY = await buy(y.accessToken, [{ id: b.id, sku: 'ATOM-B' }]);
    await ctx.request.post(`/api/v1/orders/${orderY}/pay`).set(authHeader(y.accessToken)).expect(200);

    await ctx.request.post(`/api/v1/orders/${orderX}/pay`).set(authHeader(x.accessToken)).expect(409);

    // line A was taken first, but the transaction rolled it back
    expect((await repos.products.findById(a.id))?.stock).toBe(5);
    const failed = await repos.orders.findById(orderX);
    expect(failed?.status).toBe('failed');
    expect(failed?.statusHistory.at(-1)?.status).toBe('failed');
  });

  it('answers 409 for a duplicate e-mail', async () => {
    const email = `dup_${Date.now()}@test.local`;
    const body = { name: 'Dup', email, password: 'Customer123!' };
    await ctx.request.post('/api/v1/auth/register').send(body).expect(201);
    await ctx.request.post('/api/v1/auth/register').send(body).expect(409);
  });

  it('removes guest carts nobody touched, keeps fresh and signed-in ones', async () => {
    const old = await repos.carts.getOrCreate('guest:old-visitor');
    const fresh = await repos.carts.getOrCreate('guest:fresh-visitor');
    const account = await repos.carts.getOrCreate('user:someone');
    const longAgo = new Date(Date.now() - 40 * 24 * 3600 * 1000);
    await prisma.cart.updateMany({ where: { id: { in: [old.id, account.id] } }, data: { updatedAt: longAgo } });

    const removed = await repos.carts.purgeStaleGuestCarts(new Date(Date.now() - 30 * 24 * 3600 * 1000));
    expect(removed).toBe(1);
    expect(await repos.carts.findByOwner('guest:old-visitor')).toBeNull();
    expect(await repos.carts.findByOwner('guest:fresh-visitor')).not.toBeNull();
    expect(await repos.carts.findByOwner('user:someone')).not.toBeNull();
    expect(fresh.owner).toBe('guest:fresh-visitor');
  });
});
