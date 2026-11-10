import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, registerCustomer, setupTestApp, shippingAddress, teardownTestApp, type TestContext } from '../helpers/testApp';

function sessionIdOf(url: string): string {
  const id = new URL(url).pathname.split('/').pop()!;
  expect(id).toMatch(/^cs_test_mock_/);
  return id;
}

describe('Payments (Stripe Checkout simulator)', () => {
  let ctx: TestContext;
  let server: Server;
  const stripe = new Stripe('sk_test_unused');

  beforeAll(async () => {
    ctx = await setupTestApp();
    // the simulator delivers webhooks over HTTP, like Stripe, so the app must listen
    server = ctx.app.listen(0);
    const { port } = server.address() as AddressInfo;
    const { payments } = await import('../../src/modules/ordering/infra/wiring');
    payments.mock!.gateway.webhookUrl = `http://127.0.0.1:${port}/api/v1/payments/stripe/webhook`;
  }, 120_000);

  afterAll(async () => {
    await new Promise((r) => server.close(r));
    await teardownTestApp();
  }, 60_000);

  async function pendingOrder(stock = 5) {
    const sku = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const created = await ctx.request
      .post('/api/v1/products')
      .set(authHeader(ctx.adminToken))
      .send({ slug: sku.toLowerCase(), title: 'Payment test drill', category: 'drills', price: 1999, variants: [{ sku, label: 'Standard', stock: { BER: stock } }] })
      .expect(201);
    const productId = created.body.data.id as string;
    const customer = await registerCustomer(ctx.request);
    await ctx.request.post('/api/v1/cart/items').set(authHeader(customer.accessToken)).send({ productId, sku, quantity: 1 }).expect(201);
    const checkout = await ctx.request.post('/api/v1/cart/checkout').set(authHeader(customer.accessToken)).send({ shippingAddress }).expect(201);
    return { order: checkout.body.data as { id: string; totalAmount: number }, customer, productId };
  }

  function signedEvent(body: object, secret = 'whsec_test_secret') {
    const payload = JSON.stringify(body);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    return ctx.request.post('/api/v1/payments/stripe/webhook').set('Content-Type', 'application/json').set('Stripe-Signature', signature).send(payload);
  }

  function completed(sessionId: string, orderId: string, amount: number, pi = 'pi_test_1') {
    return {
      id: `evt_${Math.random().toString(36).slice(2)}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          payment_status: 'paid',
          amount_total: amount,
          currency: 'usd',
          client_reference_id: orderId,
          metadata: { orderId },
          payment_intent: pi,
        },
      },
    };
  }

  it('customers cannot mark their own order paid', async () => {
    const { order, customer } = await pendingOrder();
    await ctx.request.post(`/api/v1/orders/${order.id}/pay`).set(authHeader(customer.accessToken)).expect(403);
  });

  it('reuses the open session, declines test cards, then pays by webhook and takes stock from a warehouse', async () => {
    const { order, customer, productId } = await pendingOrder(3);
    const auth = authHeader(customer.accessToken);
    const first = await ctx.request.post(`/api/v1/orders/${order.id}/checkout`).set(auth).expect(200);
    expect(first.body.data).toMatchObject({ mode: 'mock' });
    expect(first.body.data.url).toMatch(/^http:\/\/shop\.test\/pay\/cs_test_mock_/);
    const again = await ctx.request.post(`/api/v1/orders/${order.id}/checkout`).set(auth).expect(200);
    expect(again.body.data.url).toBe(first.body.data.url);

    const sessionId = sessionIdOf(first.body.data.url);
    const page = await ctx.request.get(`/api/v1/payments/simulator/sessions/${sessionId}`).set(auth).expect(200);
    expect(page.body.data).toMatchObject({ orderId: order.id, amount: order.totalAmount, currency: 'usd' });

    const other = await registerCustomer(ctx.request);
    await ctx.request.get(`/api/v1/payments/simulator/sessions/${sessionId}`).set(authHeader(other.accessToken)).expect(404);

    const declined = await ctx.request.post(`/api/v1/payments/simulator/sessions/${sessionId}/pay`).set(auth).send({ card: '4000 0000 0000 0002' }).expect(402);
    expect(declined.body.message).toMatch(/declined/i);
    expect((await ctx.request.get(`/api/v1/orders/${order.id}`).set(auth).expect(200)).body.data.status).toBe('pending_payment');

    const paid = await ctx.request.post(`/api/v1/payments/simulator/sessions/${sessionId}/pay`).set(auth).send({ card: '4242424242424242' }).expect(200);
    expect(paid.body.data.redirectUrl).toBe(`http://shop.test/account/orders/${order.id}?checkout=success`);
    const after = (await ctx.request.get(`/api/v1/orders/${order.id}`).set(auth).expect(200)).body.data;
    expect(after.status).toBe('paid');
    expect(after.payment).toMatchObject({ method: 'stripe', status: 'paid' });
    expect(after.payment).not.toHaveProperty('checkoutSessionId');
    expect(after.items[0].allocations).toEqual([{ warehouse: 'BER', quantity: 1 }]);
    expect((await ctx.request.get(`/api/v1/products/${productId}`).expect(200)).body.data.stock).toBe(2);

    // paid orders no longer start a checkout
    await ctx.request.post(`/api/v1/orders/${order.id}/checkout`).set(auth).expect(400);
  });

  it('rejects unsigned or tampered webhooks', async () => {
    const { order } = await pendingOrder();
    const payload = JSON.stringify(completed('cs_x', order.id, order.totalAmount));
    await ctx.request.post('/api/v1/payments/stripe/webhook').set('Content-Type', 'application/json').send(payload).expect(400);
    await signedEvent(completed('cs_x', order.id, order.totalAmount), 'whsec_wrong').expect(400);
    const check = await ctx.request.get(`/api/v1/orders/${order.id}`).set(authHeader(ctx.adminToken)).expect(200);
    expect(check.body.data.status).toBe('pending_payment');
  });

  it('confirms once when Stripe retries, and ignores a wrong amount', async () => {
    const { order, customer, productId } = await pendingOrder(4);
    const start = await ctx.request.post(`/api/v1/orders/${order.id}/checkout`).set(authHeader(customer.accessToken)).expect(200);
    const sessionId = sessionIdOf(start.body.data.url);

    await signedEvent(completed(sessionId, order.id, order.totalAmount - 1)).expect(200);
    let check = await ctx.request.get(`/api/v1/orders/${order.id}`).set(authHeader(ctx.adminToken)).expect(200);
    expect(check.body.data.status).toBe('pending_payment');

    await signedEvent(completed(sessionId, order.id, order.totalAmount, 'pi_retry')).expect(200);
    await signedEvent(completed(sessionId, order.id, order.totalAmount, 'pi_retry')).expect(200);
    check = await ctx.request.get(`/api/v1/orders/${order.id}`).set(authHeader(ctx.adminToken)).expect(200);
    expect(check.body.data.status).toBe('paid');
    expect(check.body.data.payment.transactionId).toBe('pi_retry');
    expect((await ctx.request.get(`/api/v1/products/${productId}`).expect(200)).body.data.stock).toBe(3);
  });

  it('staff can record a payment by hand', async () => {
    const { order } = await pendingOrder();
    const res = await ctx.request.post(`/api/v1/orders/${order.id}/pay`).set(authHeader(ctx.adminToken)).expect(200);
    expect(res.body.data.payment).toMatchObject({ method: 'manual', status: 'paid' });
  });
});
