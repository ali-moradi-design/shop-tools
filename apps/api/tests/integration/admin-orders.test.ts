import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, registerCustomer, setupTestApp, shippingAddress, teardownTestApp, type TestContext } from '../helpers/testApp';

type V = { sku: string; stock: number };

describe('Admin orders and customers', () => {
  let ctx: TestContext;
  let admin: { Authorization: string };
  let customer: Awaited<ReturnType<typeof registerCustomer>>;
  let orderId: string;

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = authHeader(ctx.adminToken);
    customer = await registerCustomer(ctx.request, `orders_${Date.now()}`);
    const products = await ctx.request.get('/api/v1/products?limit=1&inStock=true').expect(200);
    const p = products.body.data[0];
    const sku = (p.variants as V[]).find((v) => v.stock > 0)!.sku;
    await ctx.request.post('/api/v1/cart/items').set(authHeader(customer.accessToken)).send({ productId: p.id, sku, quantity: 1 }).expect(201);
    const checkout = await ctx.request
      .post('/api/v1/cart/checkout')
      .set(authHeader(customer.accessToken))
      .send({ shippingAddress: { ...shippingAddress, fullName: 'Searchable Person' } })
      .expect(201);
    orderId = checkout.body.data.id;
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  it('pages and filters the order list for staff', async () => {
    const all = await ctx.request.get('/api/v1/orders?limit=5').set(admin).expect(200);
    expect(all.body.meta).toMatchObject({ page: 1, limit: 5 });
    expect(all.body.meta.total).toBeGreaterThan(0);

    const byStatus = await ctx.request.get('/api/v1/orders?status=pending_payment').set(admin).expect(200);
    expect(byStatus.body.data.every((o: { status: string }) => o.status === 'pending_payment')).toBe(true);
    const paid = await ctx.request.get('/api/v1/orders?status=paid').set(admin).expect(200);
    expect(paid.body.data.some((o: { id: string }) => o.id === orderId)).toBe(false);

    await ctx.request.get('/api/v1/orders?status=lost').set(admin).expect(400);
  });

  it('finds an order by its number, the ship-to name or the e-mail', async () => {
    const number = `#${orderId.slice(-6).toUpperCase()}`;
    for (const q of [number, 'searchable pers', customer.email.slice(0, 12)]) {
      const res = await ctx.request.get(`/api/v1/orders?q=${encodeURIComponent(q)}`).set(admin).expect(200);
      expect(res.body.data.map((o: { id: string }) => o.id)).toContain(orderId);
    }
    // LIKE wildcards in the text match nothing special
    const none = await ctx.request.get('/api/v1/orders?q=%25').set(admin).expect(200);
    expect(none.body.data).toEqual([]);
  });

  it('shows a customer only their own orders, even with a search', async () => {
    const other = await registerCustomer(ctx.request);
    const res = await ctx.request.get('/api/v1/orders?q=searchable').set(authHeader(other.accessToken)).expect(200);
    expect(res.body.data).toEqual([]);
    const mine = await ctx.request.get('/api/v1/orders').set(authHeader(customer.accessToken)).expect(200);
    expect(mine.body.data.map((o: { id: string }) => o.id)).toEqual([orderId]);
  });

  it('records a note with a status change', async () => {
    const res = await ctx.request.patch(`/api/v1/orders/${orderId}/status`).set(admin).send({ status: 'cancelled', note: 'Customer called' }).expect(200);
    expect(res.body.data.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', note: 'Customer called' });
  });

  it('does not let staff block themselves or change their own roles', async () => {
    const me = await ctx.request.get('/api/v1/users/me').set(admin).expect(200);
    const id = me.body.data.id;
    await ctx.request.patch(`/api/v1/users/${id}`).set(admin).send({ isActive: false }).expect(400);
    await ctx.request.patch(`/api/v1/users/${id}`).set(admin).send({ roles: [] }).expect(400);

    // blocking someone else works, and they can no longer sign in
    await ctx.request.patch(`/api/v1/users/${customer.userId}`).set(admin).send({ isActive: false }).expect(200);
    await ctx.request.post('/api/v1/auth/login').send({ email: customer.email, password: 'Customer123!' }).expect(401);
  });
});
