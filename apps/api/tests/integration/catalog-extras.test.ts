import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/shared/infra/prisma/client';
import { authHeader, registerCustomer, setupTestApp, shippingAddress, teardownTestApp, type TestContext } from '../helpers/testApp';

describe('Search suggestions and back-in-stock alerts', () => {
  let ctx: TestContext;
  let admin: { Authorization: string };

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = authHeader(ctx.adminToken);
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  async function product(stock: number) {
    const sku = `ALERT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const res = await ctx.request
      .post('/api/v1/products')
      .set(admin)
      .send({ slug: sku.toLowerCase(), title: 'Zebrawood Chisel Set', model: sku, category: 'hand-tools', price: 2500, variants: [{ sku, label: 'Set of 4', stock: { BER: stock } }] })
      .expect(201);
    return { id: res.body.data.id as string, sku };
  }

  it('suggests products from the start of a word, the model or a SKU', async () => {
    const { sku } = await product(1);
    const word = await ctx.request.get('/api/v1/products/suggest?q=chis').expect(200);
    expect(word.body.data.some((p: { title: string }) => p.title === 'Zebrawood Chisel Set')).toBe(true);
    expect(word.headers['cache-control']).toContain('max-age=60');
    const inside = await ctx.request.get('/api/v1/products/suggest?q=hisel').expect(200);
    expect(inside.body.data.some((p: { title: string }) => p.title === 'Zebrawood Chisel Set')).toBe(false);
    const bySku = await ctx.request.get(`/api/v1/products/suggest?q=${sku.slice(0, 12)}`).expect(200);
    expect(bySku.body.data[0]).toMatchObject({ title: 'Zebrawood Chisel Set', inStock: true });
    expect((await ctx.request.get('/api/v1/products/suggest?q=%25%25').expect(200)).body.data).toEqual([]);
    await ctx.request.get('/api/v1/products/suggest?q=z').expect(400);
  });

  it('emails each waiting address once when a sold-out option is restocked', async () => {
    const { id, sku } = await product(0);
    const email = `wait_${Date.now()}@test.local`;
    await ctx.request.post(`/api/v1/products/${id}/stock-alerts`).send({ sku, email }).expect(201);
    await ctx.request.post(`/api/v1/products/${id}/stock-alerts`).send({ sku, email: email.toUpperCase() }).expect(201);
    expect(await prisma.stockAlert.count({ where: { productId: id } })).toBe(1);
    await ctx.request.post(`/api/v1/products/${id}/stock-alerts`).send({ sku: 'NOPE', email }).expect(404);
    await ctx.request.post(`/api/v1/products/${id}/stock-alerts`).send({ sku }).expect(400);

    await ctx.request.patch(`/api/v1/products/${id}`).set(admin).send({ variants: [{ sku, label: 'Set of 4', stock: { BER: 2 } }] }).expect(200);
    const mails = await prisma.emailMessage.findMany({ where: { to: email, template: 'back-in-stock' } });
    expect(mails).toHaveLength(1);
    expect(mails[0].text).toContain('Set of 4');
    await ctx.request.post(`/api/v1/products/${id}/stock-alerts`).send({ sku, email }).expect(409);

    // a later restock does not email the same alert again
    await ctx.request.patch(`/api/v1/products/${id}`).set(admin).send({ variants: [{ sku, label: 'Set of 4', stock: { BER: 0 } }] }).expect(200);
    await ctx.request.patch(`/api/v1/products/${id}`).set(admin).send({ variants: [{ sku, label: 'Set of 4', stock: { BER: 5 } }] }).expect(200);
    expect(await prisma.emailMessage.count({ where: { to: email, template: 'back-in-stock' } })).toBe(1);
  });

  it('a cancelled order that brings an option back wakes its alerts too', async () => {
    const { id, sku } = await product(1);
    const c = await registerCustomer(ctx.request);
    await ctx.request.post('/api/v1/cart/items').set(authHeader(c.accessToken)).send({ productId: id, sku, quantity: 1 }).expect(201);
    const order = (await ctx.request.post('/api/v1/cart/checkout').set(authHeader(c.accessToken)).send({ shippingAddress }).expect(201)).body.data;
    await ctx.request.post(`/api/v1/orders/${order.id}/pay`).set(admin).expect(200);
    const email = `wait2_${Date.now()}@test.local`;
    await ctx.request.post(`/api/v1/products/${id}/stock-alerts`).send({ sku, email }).expect(201);
    await ctx.request.patch(`/api/v1/orders/${order.id}/status`).set(admin).send({ status: 'cancelled' }).expect(200);
    expect(await prisma.emailMessage.count({ where: { to: email, template: 'back-in-stock' } })).toBe(1);
  });
});
