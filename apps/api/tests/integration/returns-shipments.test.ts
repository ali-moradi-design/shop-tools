import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/shared/infra/prisma/client';
import { authHeader, registerCustomer, setupTestApp, shippingAddress, teardownTestApp, type TestContext } from '../helpers/testApp';

describe('Cancellations, shipments and returns', () => {
  let ctx: TestContext;
  let server: Server;
  let admin: { Authorization: string };

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = authHeader(ctx.adminToken);
    server = ctx.app.listen(0);
    const { port } = server.address() as AddressInfo;
    const { payments } = await import('../../src/modules/ordering/infra/wiring');
    payments.mock!.gateway.webhookUrl = `http://127.0.0.1:${port}/api/v1/payments/stripe/webhook`;
  }, 120_000);

  afterAll(async () => {
    await new Promise((r) => server.close(r));
    await teardownTestApp();
  }, 60_000);

  /** A product with stock in two warehouses, and an order of `quantity` paid through the Stripe simulator. */
  async function paidOrder(quantity = 3) {
    const sku = `RET.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const created = await ctx.request
      .post('/api/v1/products')
      .set(admin)
      .send({ slug: sku.toLowerCase().replace(/\./g, '-'), title: 'Return test saw', category: 'saws', price: 5000, variants: [{ sku, label: 'Kit', stock: { BER: 1, HAM: 5 } }] })
      .expect(201);
    const productId = created.body.data.id as string;
    const c = await registerCustomer(ctx.request);
    const auth = authHeader(c.accessToken);
    await ctx.request.post('/api/v1/cart/items').set(auth).send({ productId, sku, quantity }).expect(201);
    const order = (await ctx.request.post('/api/v1/cart/checkout').set(auth).send({ shippingAddress }).expect(201)).body.data;
    const url = (await ctx.request.post(`/api/v1/orders/${order.id}/checkout`).set(auth).expect(200)).body.data.url as string;
    const session = new URL(url).pathname.split('/').pop();
    await ctx.request.post(`/api/v1/payments/simulator/sessions/${session}/pay`).set(auth).send({ card: '4242424242424242' }).expect(200);
    return { order: order as { id: string; totalAmount: number }, auth, productId, email: c.email };
  }

  async function stockOf(productId: string) {
    const p = (await ctx.request.get(`/api/v1/products/${productId}`).expect(200)).body.data;
    return Object.fromEntries((p.warehouses as { warehouse: string; quantity: number }[]).map((w) => [w.warehouse, w.quantity]));
  }

  it('a customer cancels a paid order: refunded, and units go back to the warehouses they came from', async () => {
    const { order, auth, productId, email } = await paidOrder(3);
    expect(await stockOf(productId)).toMatchObject({ BER: 0, HAM: 3 });
    const res = await ctx.request.post(`/api/v1/orders/${order.id}/cancel`).set(auth).send({ reason: 'Bought the wrong one' }).expect(200);
    expect(res.body.data).toMatchObject({ status: 'cancelled', refunded: true });
    expect(res.body.data.statusHistory.at(-1).note).toMatch(/Cancelled by customer: Bought the wrong one · Refunded re_mock_/);
    expect(await stockOf(productId)).toMatchObject({ BER: 1, HAM: 5 });
    const mail = await prisma.emailMessage.findFirst({ where: { to: email.toLowerCase(), template: 'order-cancelled' } });
    expect(mail?.text).toMatch(/refunded your payment/);
    // another customer cannot cancel it
    const other = await registerCustomer(ctx.request);
    await ctx.request.post(`/api/v1/orders/${order.id}/cancel`).set(authHeader(other.accessToken)).send({}).expect(403);
  });

  it('ships with a carrier and tracking link; a shipped order cannot be cancelled', async () => {
    const { order, auth, email } = await paidOrder(1);
    await ctx.request.patch(`/api/v1/orders/${order.id}/status`).set(admin).send({ status: 'processing' }).expect(200);
    await ctx.request.patch(`/api/v1/orders/${order.id}/status`).set(admin).send({ status: 'shipped', shipment: { carrier: 'DHL', trackingNumber: 'x' } }).expect(400);
    const shipped = await ctx.request.patch(`/api/v1/orders/${order.id}/status`).set(admin).send({ status: 'shipped', shipment: { carrier: 'DHL', trackingNumber: ' 00340434 ' } }).expect(200);
    expect(shipped.body.data.shipment).toMatchObject({ carrier: 'DHL', trackingNumber: '00340434' });
    expect(shipped.body.data.shipment.url).toContain('piececode=00340434');
    expect((await prisma.emailMessage.findFirst({ where: { to: email.toLowerCase(), template: 'order-shipped' } }))?.text).toContain('00340434');
    const refused = await ctx.request.post(`/api/v1/orders/${order.id}/cancel`).set(auth).send({}).expect(400);
    expect(refused.body.message).toMatch(/request a return/);
  });

  it('returns: only after shipping, never more units than bought, staff refund with the discount share', async () => {
    const { order, auth, email } = await paidOrder(3);
    const early = await ctx.request.post('/api/v1/returns').set(auth).send({ orderId: order.id, reason: 'damaged', items: [{ line: 0, quantity: 1 }] }).expect(400);
    expect(early.body.message).toMatch(/once your order has shipped/);

    await ctx.request.patch(`/api/v1/orders/${order.id}/status`).set(admin).send({ status: 'processing' }).expect(200);
    await ctx.request.patch(`/api/v1/orders/${order.id}/status`).set(admin).send({ status: 'shipped', shipment: { carrier: 'UPS', trackingNumber: '1Z999AA1' } }).expect(200);

    const first = await ctx.request.post('/api/v1/returns').set(auth).send({ orderId: order.id, reason: 'damaged', items: [{ line: 0, quantity: 2 }] }).expect(201);
    expect(first.body.data).toMatchObject({ status: 'requested', refundAmount: 10000 });
    expect(first.body.data.items[0].sku).toMatch(/^RET\./);
    await ctx.request.post('/api/v1/returns').set(auth).send({ orderId: order.id, reason: 'damaged', items: [{ line: 0, quantity: 2 }] }).expect(400);
    await ctx.request.post('/api/v1/returns').set(auth).send({ orderId: order.id, reason: 'damaged', items: [{ line: 5, quantity: 1 }] }).expect(400);

    const mine = await ctx.request.get(`/api/v1/returns/mine?order=${order.id}`).set(auth).expect(200);
    expect(mine.body.data).toHaveLength(1);
    await ctx.request.get('/api/v1/returns').set(auth).expect(403);

    const id = first.body.data.id as string;
    await ctx.request.patch(`/api/v1/returns/${id}`).set(admin).send({ status: 'refunded' }).expect(400);
    await ctx.request.patch(`/api/v1/returns/${id}`).set(admin).send({ status: 'approved', note: 'Send it to Berlin' }).expect(200);
    await ctx.request.patch(`/api/v1/returns/${id}`).set(admin).send({ status: 'received' }).expect(200);
    const refunded = await ctx.request.patch(`/api/v1/returns/${id}`).set(admin).send({ status: 'refunded' }).expect(200);
    expect(refunded.body.data).toMatchObject({ status: 'refunded', refunded: true });
    expect(refunded.body.data.history.map((h: { status: string }) => h.status)).toEqual(['requested', 'approved', 'received', 'refunded']);
    const list = await ctx.request.get('/api/v1/returns?status=refunded').set(admin).expect(200);
    expect(list.body.data.some((r: { id: string }) => r.id === id)).toBe(true);
    const mails = await prisma.emailMessage.count({ where: { to: email.toLowerCase(), template: 'return-update' } });
    expect(mails).toBe(4);
  });
});
