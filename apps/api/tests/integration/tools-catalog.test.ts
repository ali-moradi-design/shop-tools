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

type P = {
  id: string;
  slug: string;
  stock: number;
  warehouses: { warehouse: string; quantity: number }[];
  specs: { key: string; value: number | string }[];
  variants: { sku: string; stock: number; price?: number }[];
};
const spec = (p: P, key: string) => p.specs.find((s) => s.key === key)?.value;

describe('Tools catalog', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  describe('categories and warehouses', () => {
    it('lists categories with counts and specification definitions in several units', async () => {
      const res = await ctx.request.get('/api/v1/categories').expect(200);
      const drills = res.body.data.find((c: { slug: string }) => c.slug === 'drills');
      expect(drills.productCount).toBeGreaterThan(0);
      const torque = drills.specs.find((s: { key: string }) => s.key === 'torque');
      expect(torque).toMatchObject({ unit: 'Nm', better: 'higher', filterable: true });
      expect(torque.units.map((u: { symbol: string }) => u.symbol)).toEqual(['Nm', 'in·lb', 'ft·lb']);
      expect(torque.units[0].factor).toBe(1);

      await ctx.request.get('/api/v1/categories/drills').expect(200);
      await ctx.request.get('/api/v1/categories/not-a-category').expect(404);
    });

    it('lists the warehouses in dispatch order', async () => {
      const res = await ctx.request.get('/api/v1/warehouses').expect(200);
      expect(res.body.data.map((w: { code: string }) => w.code)).toEqual(['BER', 'HAM', 'MUC']);
    });
  });

  describe('filtering by specifications', () => {
    it('filters by a numeric range', async () => {
      const all = await ctx.request.get('/api/v1/products?category=drills&limit=100').expect(200);
      const torques = (all.body.data as P[]).map((p) => Number(spec(p, 'torque'))).filter(Boolean);
      expect(torques.length).toBeGreaterThan(1);
      const lo = Math.min(...torques);
      const mid = [...torques].sort((a, b) => a - b)[Math.floor(torques.length / 2)];

      const res = await ctx.request
        .get('/api/v1/products')
        .query({ category: 'drills', 'spec.torque': `${lo}..${mid}Nm`, limit: '100' })
        .expect(200);
      const found = res.body.data as P[];
      expect(found.length).toBeGreaterThan(0);
      expect(found.length).toBeLessThan(torques.length + 1);
      for (const p of found) expect(Number(spec(p, 'torque'))).toBeLessThanOrEqual(mid);
    });

    it('gives the same result in Nm and in in·lb', async () => {
      const nm = await ctx.request
        .get('/api/v1/products')
        .query({ category: 'drills', 'spec.torque': '40..100Nm', limit: '100' })
        .expect(200);
      const inLb = await ctx.request
        .get('/api/v1/products')
        .query({ category: 'drills', 'spec.torque': '354.02984..885.0746in·lb', limit: '100' })
        .expect(200);
      expect(inLb.body.data.map((p: P) => p.slug)).toEqual(nm.body.data.map((p: P) => p.slug));
    });

    it('filters by words and combines filters with AND', async () => {
      const brushless = await ctx.request
        .get('/api/v1/products')
        .query({ category: 'drills', 'spec.motor': 'Brushless', limit: '100' })
        .expect(200);
      expect((brushless.body.data as P[]).every((p) => spec(p, 'motor') === 'Brushless')).toBe(true);

      const both = await ctx.request
        .get('/api/v1/products')
        .query({ category: 'drills', 'spec.motor': 'Brushless', 'spec.voltage': '18', limit: '100' })
        .expect(200);
      for (const p of both.body.data as P[]) {
        expect(spec(p, 'motor')).toBe('Brushless');
        expect(Number(spec(p, 'voltage'))).toBe(18);
      }
    });

    it('filters by warehouse stock', async () => {
      const res = await ctx.request.get('/api/v1/products').query({ warehouse: 'MUC', limit: '100' }).expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const p of res.body.data as P[]) {
        expect(p.warehouses.find((w) => w.warehouse === 'MUC')!.quantity).toBeGreaterThan(0);
      }
    });

    it('rejects filters it cannot apply', async () => {
      await ctx.request.get('/api/v1/products').query({ 'spec.torque': '40..100' }).expect(400); // no category
      await ctx.request.get('/api/v1/products').query({ category: 'drills', 'spec.nope': '1' }).expect(400);
      await ctx.request.get('/api/v1/products').query({ category: 'drills', 'spec.torque': '40..100kg' }).expect(400);
      await ctx.request.get('/api/v1/products').query({ category: 'drills', 'spec.torque': 'abc' }).expect(400);
      await ctx.request.get('/api/v1/products').query({ category: 'drills', whatever: '1' }).expect(400);
    });

    it('gives the sidebar its numbers: ranges, options with counts, units and warehouses', async () => {
      const res = await ctx.request.get('/api/v1/products/facets?category=drills').expect(200);
      const { specs, warehouses, price } = res.body.data;
      const torque = specs.find((s: { key: string }) => s.key === 'torque');
      expect(torque.min).toBeLessThanOrEqual(torque.max);
      expect(torque.units.length).toBe(3);
      const motor = specs.find((s: { key: string }) => s.key === 'motor');
      expect(motor.options.length).toBeGreaterThan(0);
      expect(motor.options[0]).toHaveProperty('count');
      expect(warehouses.map((w: { code: string }) => w.code)).toEqual(['BER', 'HAM', 'MUC']);
      expect(price.max).toBeGreaterThanOrEqual(price.min);
    });
  });

  describe('compare', () => {
    const slugsOf = async (category: string, n: number) => {
      const res = await ctx.request.get('/api/v1/products').query({ category, limit: String(n) }).expect(200);
      return (res.body.data as P[]).map((p) => p.slug);
    };

    it('lines up the specifications of 2 to 4 products and marks the best value', async () => {
      const slugs = await slugsOf('drills', 3);
      expect(slugs.length).toBe(3);
      const res = await ctx.request.get('/api/v1/products/compare').query({ slugs: slugs.join(',') }).expect(200);
      const { category, products, rows, warehouses } = res.body.data;
      expect(category.slug).toBe('drills');
      expect(products.map((p: P) => p.slug)).toEqual(slugs);
      expect(warehouses.length).toBe(3);

      const torque = rows.find((r: { key: string }) => r.key === 'torque');
      expect(torque.values.length).toBe(3);
      const numbers = torque.values.filter((v: number | null) => v !== null) as number[];
      if (!torque.same) {
        const bestIndexes = torque.best.flatMap((b: boolean, i: number) => (b ? [i] : []));
        expect(bestIndexes.length).toBeGreaterThan(0);
        for (const i of bestIndexes) expect(torque.values[i]).toBe(Math.max(...numbers));
      }
      // weight: lower is better
      const weight = rows.find((r: { key: string }) => r.key === 'weight');
      if (weight && !weight.same) {
        const numbersW = weight.values.filter((v: number | null) => v !== null) as number[];
        weight.best.forEach((b: boolean, i: number) => {
          if (b) expect(weight.values[i]).toBe(Math.min(...numbersW));
        });
      }
      // a word specification has no "best"
      const motor = rows.find((r: { key: string }) => r.key === 'motor');
      expect(motor.best.every((b: boolean) => b === false)).toBe(true);
    });

    it('accepts at most four products, at least two, one category, known products', async () => {
      const parts = [1, 2, 3, 4, 5].map((n) => ({
        slug: `cmp-${n}`,
        title: `compare ${n}`,
        category: 'accessories',
        price: 100 * n,
        variants: [{ sku: `CMP-${n}`, label: 'Standard', stock: { BER: 1 } }],
        specs: { weight: n / 10 },
      }));
      for (const p of parts) await ctx.request.post('/api/v1/products').set(authHeader(ctx.adminToken)).send(p).expect(201);
      const five = parts.map((p) => p.slug);

      await ctx.request.get('/api/v1/products/compare').query({ slugs: five.join(',') }).expect(400); // five
      await ctx.request.get('/api/v1/products/compare').query({ slugs: five[0] }).expect(400); // one
      await ctx.request.get('/api/v1/products/compare').query({ slugs: `${five[0]},${five[0]}` }).expect(400); // the same twice
      await ctx.request.get('/api/v1/products/compare').query({ slugs: `${five[0]},does-not-exist` }).expect(404);

      const [drill] = await slugsOf('drills', 1);
      const mixed = await ctx.request.get('/api/v1/products/compare').query({ slugs: `${five[0]},${drill}` }).expect(400);
      expect(mixed.body.message).toMatch(/same category/);

      const four = await ctx.request.get('/api/v1/products/compare').query({ slugs: five.slice(0, 4).join(',') }).expect(200);
      expect(four.body.data.products.length).toBe(4);
      // the lightest one is the best (weight: lower is better)
      const weight = four.body.data.rows.find((r: { key: string }) => r.key === 'weight');
      expect(weight.best).toEqual([true, false, false, false]);
    });
  });

  describe('stock per warehouse', () => {
    const make = (slug: string, stock: Record<string, number>, extra: Record<string, unknown> = {}) => ({
      slug,
      title: `${slug} test drill`,
      category: 'drills',
      price: 10000,
      variants: [{ sku: slug.toUpperCase(), label: 'Standard', stock }],
      ...extra,
    });

    it('sums the warehouses and rejects an unknown warehouse', async () => {
      const ok = await ctx.request
        .post('/api/v1/products')
        .set(authHeader(ctx.adminToken))
        .send(make('wh-sum', { BER: 3, HAM: 4, MUC: 5 }))
        .expect(201);
      expect(ok.body.data.stock).toBe(12);
      expect(ok.body.data.warehouses).toEqual([
        { warehouse: 'BER', quantity: 3 },
        { warehouse: 'HAM', quantity: 4 },
        { warehouse: 'MUC', quantity: 5 },
      ]);

      const patched = await ctx.request
        .patch(`/api/v1/products/${ok.body.data.id}`)
        .set(authHeader(ctx.adminToken))
        .send({ variants: [{ sku: 'WH-SUM', label: 'Standard', stock: { BER: 0, HAM: 9 } }] })
        .expect(200);
      expect(patched.body.data.stock).toBe(9);
      expect(patched.body.data.variants[0].stockByWarehouse).toEqual([
        { warehouse: 'BER', quantity: 0 },
        { warehouse: 'HAM', quantity: 9 },
      ]);

      await ctx.request
        .post('/api/v1/products')
        .set(authHeader(ctx.adminToken))
        .send(make('wh-bad', { PARIS: 1 }))
        .expect(400);
    });

    it('does not let two products share a SKU', async () => {
      await ctx.request.post('/api/v1/products').set(authHeader(ctx.adminToken)).send(make('sku-a', { BER: 1 })).expect(201);
      const dup = make('sku-b', { BER: 1 });
      dup.variants[0].sku = 'SKU-A';
      await ctx.request.post('/api/v1/products').set(authHeader(ctx.adminToken)).send(dup).expect(409);
    });

    it('takes units from the warehouses in dispatch order and remembers where from', async () => {
      const created = await ctx.request
        .post('/api/v1/products')
        .set(authHeader(ctx.adminToken))
        .send(make('alloc', { BER: 1, HAM: 5, MUC: 5 }))
        .expect(201);
      const productId = created.body.data.id as string;
      const c = await registerCustomer(ctx.request, `alloc_${Date.now()}`);
      await ctx.request
        .post('/api/v1/cart/items')
        .set(authHeader(c.accessToken))
        .send({ productId, sku: 'ALLOC', quantity: 3 })
        .expect(201);
      const order = await ctx.request
        .post('/api/v1/cart/checkout')
        .set(authHeader(c.accessToken))
        .send({ shippingAddress })
        .expect(201);
      const paid = await ctx.request
        .post(`/api/v1/orders/${order.body.data.id}/pay`)
        .set(authHeader(c.accessToken))
        .expect(200);

      expect(paid.body.data.items[0].allocations).toEqual([
        { warehouse: 'BER', quantity: 1 },
        { warehouse: 'HAM', quantity: 2 },
      ]);
      const after = await ctx.request.get(`/api/v1/products/${productId}`).expect(200);
      expect(after.body.data.warehouses).toEqual([
        { warehouse: 'BER', quantity: 0 },
        { warehouse: 'HAM', quantity: 3 },
        { warehouse: 'MUC', quantity: 5 },
      ]);
      expect(after.body.data.stock).toBe(8);
    });

    it('does not sell more than all warehouses together have', async () => {
      const p = await repos.products.create({
        slug: 'last-two',
        title: 'last two',
        category: 'drills',
        price: 100,
        variants: [{ sku: 'LAST-TWO', label: 'Standard', stock: { BER: 1, HAM: 1 } }],
      });
      expect(await repos.products.decrementStock(p.id, 'LAST-TWO', 3)).toBeNull();
      expect((await repos.products.findById(p.id))?.stock).toBe(2); // nothing was taken
      expect(await repos.products.decrementStock(p.id, 'LAST-TWO', 2)).toEqual([
        { warehouse: 'BER', quantity: 1 },
        { warehouse: 'HAM', quantity: 1 },
      ]);
    });
  });

  describe('variants with their own price', () => {
    it('charges the variant price in the cart and on the order', async () => {
      const created = await ctx.request
        .post('/api/v1/products')
        .set(authHeader(ctx.adminToken))
        .send({
          slug: 'kit-price',
          title: 'kit price drill',
          category: 'drills',
          price: 20000,
          variants: [
            { sku: 'KP-KIT', label: '2 × 4.0 Ah kit', stock: { BER: 5 } },
            { sku: 'KP-BODY', label: 'Body only', price: 12000, stock: { BER: 5 } },
          ],
        })
        .expect(201);
      const productId = created.body.data.id as string;
      const c = await registerCustomer(ctx.request, `kit_${Date.now()}`);
      for (const sku of ['KP-KIT', 'KP-BODY']) {
        await ctx.request.post('/api/v1/cart/items').set(authHeader(c.accessToken)).send({ productId, sku, quantity: 1 }).expect(201);
      }
      const cart = await ctx.request.get('/api/v1/cart').set(authHeader(c.accessToken)).expect(200);
      const prices = Object.fromEntries(cart.body.data.items.map((i: { sku: string; price: number }) => [i.sku, i.price]));
      expect(prices).toEqual({ 'KP-KIT': 20000, 'KP-BODY': 12000 });
      expect(cart.body.data.subtotal).toBe(32000);
      expect(cart.body.data.items.map((i: { label: string }) => i.label).sort()).toEqual(['2 × 4.0 Ah kit', 'Body only']);

      const order = await ctx.request
        .post('/api/v1/cart/checkout')
        .set(authHeader(c.accessToken))
        .send({ shippingAddress })
        .expect(201);
      expect(order.body.data.subtotalAmount).toBe(32000);
    });
  });

  describe('product specs are validated against the category', () => {
    it('rejects unknown keys and wrong value types, accepts valid ones', async () => {
      const base = {
        title: 'spec check',
        category: 'drills',
        price: 100,
        variants: [{ sku: 'SC-1', label: 'Standard', stock: { BER: 1 } }],
      };
      await ctx.request.post('/api/v1/products').set(authHeader(ctx.adminToken)).send({ ...base, slug: 'sc-1', specs: { colour: 'red' } }).expect(400);
      await ctx.request.post('/api/v1/products').set(authHeader(ctx.adminToken)).send({ ...base, slug: 'sc-2', variants: [{ sku: 'SC-2', label: 'x', stock: { BER: 1 } }], specs: { torque: 'strong' } }).expect(400);
      await ctx.request.post('/api/v1/products').set(authHeader(ctx.adminToken)).send({ ...base, slug: 'sc-3', category: 'nope', variants: [{ sku: 'SC-3', label: 'x', stock: { BER: 1 } }] }).expect(400);
      const ok = await ctx.request
        .post('/api/v1/products')
        .set(authHeader(ctx.adminToken))
        .send({ ...base, slug: 'sc-4', variants: [{ sku: 'SC-4', label: 'x', stock: { BER: 1 } }], specs: { torque: 70, motor: 'Brushless' } })
        .expect(201);
      expect(ok.body.data.specs.map((s: { key: string }) => s.key)).toEqual(['motor', 'torque']);
    });
  });
});
