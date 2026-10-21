import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  authHeader,
  registerCustomer,
  setupTestApp,
  shippingAddress,
  teardownTestApp,
  type TestContext,
} from '../helpers/testApp';
import { prisma } from '../../src/shared/infra/prisma/client';

const API = '/api/v1';

describe('Security checks (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });
  afterAll(async () => {
    await teardownTestApp();
  });

  describe('access control', () => {
    it.each([
      ['get', '/orders'],
      ['post', '/products'],
      ['patch', '/products/x'],
      ['delete', '/products/x'],
      ['post', '/orders/x/pay'],
    ] as const)('anonymous %s %s is refused', async (method, path) => {
      const res = await ctx.request[method](`${API}${path}`).send({});
      expect(res.status).toBe(401);
    });

    it('a customer cannot create, change or delete products', async () => {
      const c = await registerCustomer(ctx.request);
      const list = await ctx.request.get(`${API}/products?limit=1`).expect(200);
      const id = list.body.data[0].id as string;
      await ctx.request.post(`${API}/products`).set(authHeader(c.accessToken)).send({}).expect(403);
      await ctx.request.patch(`${API}/products/${id}`).set(authHeader(c.accessToken)).send({ price: 1 }).expect(403);
      await ctx.request.delete(`${API}/products/${id}`).set(authHeader(c.accessToken)).expect(403);
    });

    it('registration cannot choose a role', async () => {
      const email = `eve_${Date.now()}@test.local`;
      const res = await ctx.request
        .post(`${API}/auth/register`)
        .send({ name: 'Eve', email, password: 'Customer123!', role: 'admin' });
      // either refused as an unknown field or accepted as a plain customer: never an admin
      expect([201, 400]).toContain(res.status);
      if (res.status === 201) {
        // the new account must not reach an admin-only route
        await ctx.request.post(`${API}/products`).set(authHeader(res.body.accessToken)).send({}).expect(403);
      }
    });

    it("one customer cannot read or pay another customer's order", async () => {
      const owner = await registerCustomer(ctx.request);
      const other = await registerCustomer(ctx.request);
      const products = await ctx.request.get(`${API}/products?limit=1&inStock=true`).expect(200);
      const product = products.body.data[0];
      const sku = product.variants.find((v: { stock: number }) => v.stock >= 1).sku as string;
      await ctx.request.post(`${API}/cart/items`).set(authHeader(owner.accessToken)).send({ productId: product.id, sku, quantity: 1 }).expect(201);
      const order = (await ctx.request.post(`${API}/cart/checkout`).set(authHeader(owner.accessToken)).send({ shippingAddress }).expect(201)).body.data;

      const read = await ctx.request.get(`${API}/orders/${order.id}`).set(authHeader(other.accessToken));
      expect([403, 404]).toContain(read.status);
      const pay = await ctx.request.post(`${API}/orders/${order.id}/pay`).set(authHeader(other.accessToken));
      expect([403, 404]).toContain(pay.status);
      const stillPending = await ctx.request.get(`${API}/orders/${order.id}`).set(authHeader(owner.accessToken)).expect(200);
      expect(stillPending.body.data.status).toBe('pending_payment');
    });
  });

  describe('malformed requests', () => {
    it('invalid JSON is a 400, not a 500', async () => {
      const res = await ctx.request.post(`${API}/auth/login`).set('Content-Type', 'application/json').send('{"email":');
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError| at /);
    });

    it('a body over the limit is a 413', async () => {
      const res = await ctx.request.post(`${API}/auth/login`).send({ email: 'a'.repeat(2_000_000), password: 'x' });
      expect(res.status).toBe(413);
    });

    it('a client price in the cart is ignored: the total comes from the catalog', async () => {
      const c = await registerCustomer(ctx.request);
      const product = (await ctx.request.get(`${API}/products?limit=1&inStock=true`).expect(200)).body.data[0];
      const sku = product.variants.find((v: { stock: number }) => v.stock >= 1).sku as string;
      await ctx.request.post(`${API}/cart/items`).set(authHeader(c.accessToken)).send({ productId: product.id, sku, quantity: 1, price: 1 });
      const order = (await ctx.request.post(`${API}/cart/checkout`).set(authHeader(c.accessToken)).send({ shippingAddress, totalAmount: 1 }).expect(201)).body.data;
      expect(order.totalAmount).toBeGreaterThan(100);
    });

    it.each([-5, 0, 1.5, 1e9])('quantity %s is refused', async (quantity) => {
      const c = await registerCustomer(ctx.request);
      const product = (await ctx.request.get(`${API}/products?limit=1&inStock=true`).expect(200)).body.data[0];
      const res = await ctx.request.post(`${API}/cart/items`).set(authHeader(c.accessToken)).send({ productId: product.id, sku: product.variants[0].sku, quantity });
      expect([400, 409]).toContain(res.status);
    });
  });

  describe('injection and abuse of the catalog query', () => {
    const payloads = ["' OR 1=1 --", '1;DROP TABLE Product', '\\', '%', '_', "a'||sleep(3)||'", '${7*7}', '\u0000'];

    it.each(payloads)('number spec filter %j is a 400', async (value) => {
      const res = await ctx.request.get(`${API}/products`).query({ category: 'drills', 'spec.torque': value });
      expect(res.status).toBe(400);
    });

    it.each(payloads)('text spec filter %j never reaches SQL as code', async (value) => {
      const started = Date.now();
      const res = await ctx.request.get(`${API}/products`).query({ category: 'drills', 'spec.motor': value });
      expect(res.status).toBeLessThan(500);
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it.each(payloads)('search %j is treated as text', async (value) => {
      const started = Date.now();
      const res = await ctx.request.get(`${API}/products`).query({ q: value });
      expect(res.status).toBeLessThan(500);
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it('the tables still exist after the attempts', async () => {
      const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM Product`;
      expect(Number(rows[0].n)).toBeGreaterThan(0);
    });

    it.each([
      'evil=1',
      '__proto__[x]=1',
      'constructor[prototype][x]=1',
      'category=drills&category=saws',
      'spec.torque=1&spec.torque=2',
      'sort=price;drop',
      "warehouse=BER'--",
      'limit=100000',
      'page=-1',
      'spec.=1',
      'spec.torque.x=1',
    ])('odd query %s is refused', async (qs) => {
      const res = await ctx.request.get(`${API}/products?${qs}`);
      expect(res.status).toBe(400);
    });

    it('caps the number and length of spec filters', async () => {
      const many = Array.from({ length: 60 }, (_, i) => `spec.k${i}=1`).join('&');
      expect((await ctx.request.get(`${API}/products?category=drills&${many}`)).status).toBe(400);
      expect((await ctx.request.get(`${API}/products?category=drills&spec.motor=${'x'.repeat(5000)}`)).status).toBe(400);
      expect((await ctx.request.get(`${API}/products?q=${'x'.repeat(5000)}`)).status).toBe(400);
    });

    it('compare is limited to 4 slugs and short slugs', async () => {
      const fifty = Array.from({ length: 50 }, (_, i) => `s${i}`).join(',');
      expect((await ctx.request.get(`${API}/products/compare?slugs=${fifty}`)).status).toBe(400);
      expect((await ctx.request.get(`${API}/products/compare?slugs=${'a'.repeat(3000)},b`)).status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('stock cannot be oversold', () => {
    it('many simultaneous payments for the last 2 units: exactly 2 succeed, stock never goes negative', async () => {
      const created = await ctx.request
        .post(`${API}/products`)
        .set(authHeader(ctx.adminToken))
        .send({
          slug: `race-${Date.now()}`,
          title: 'Race Test Drill',
          brand: 'TESTCO',
          category: 'drills',
          description: 'Created in the concurrency test',
          price: 1999,
          variants: [{ sku: `RACE-${Date.now()}`, label: 'Standard', stock: { BER: 1, HAM: 1 } }],
          specs: { voltage: 18 },
        })
        .expect(201);
      const productId = created.body.data.id as string;
      const sku = created.body.data.variants[0].sku as string;

      const buyers = await Promise.all(Array.from({ length: 8 }, () => registerCustomer(ctx.request)));
      const orderIds: string[] = [];
      for (const b of buyers) {
        await ctx.request.post(`${API}/cart/items`).set(authHeader(b.accessToken)).send({ productId, sku, quantity: 1 }).expect(201);
        const order = (await ctx.request.post(`${API}/cart/checkout`).set(authHeader(b.accessToken)).send({ shippingAddress }).expect(201)).body.data;
        orderIds.push(order.id);
      }

      const results = await Promise.all(
        buyers.map((b, i) => ctx.request.post(`${API}/orders/${orderIds[i]}/pay`).set(authHeader(b.accessToken))),
      );
      const ok = results.filter((r) => r.status === 200).length;
      const refused = results.filter((r) => r.status === 409).length;
      expect(ok).toBe(2);
      expect(refused).toBe(6);

      const levels = await prisma.stockLevel.findMany({ where: { variant: { sku } } });
      expect(levels.every((l) => l.quantity >= 0)).toBe(true);
      expect(levels.reduce((n, l) => n + l.quantity, 0)).toBe(0);
      const allocations = await prisma.orderItemAllocation.count({ where: { orderItem: { sku } } });
      expect(allocations).toBe(2);
    });
  });
});
