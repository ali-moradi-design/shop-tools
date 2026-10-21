import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  authHeader,
  registerCustomer,
  setupTestApp,
  shippingAddress,
  teardownTestApp,
  type TestContext,
} from '../helpers/testApp';

function newProduct(slug: string, stock: number) {
  return {
    slug: `${slug}-${Date.now()}`,
    title: 'Test Drill Driver 18 V',
    brand: 'TESTCO',
    category: 'drills',
    description: 'Created in integration test',
    price: 1999,
    variants: [{ sku: `TEST-${slug}-${Date.now()}`, label: 'Standard', stock: { BER: stock } }],
    specs: { voltage: 18, torque: 60 },
  };
}

function inStockSku(product: { variants: { sku: string; stock: number }[] }, qty: number): string {
  const variant = product.variants.find((v) => v.stock >= qty);
  if (!variant) throw new Error('No variant with enough stock in seed data');
  return variant.sku;
}

describe('Welt & Grain API (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  describe('Health', () => {
    it('GET /api/health returns ok', async () => {
      const res = await ctx.request.get('/api/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeTruthy();
    });
  });

  describe('API docs', () => {
    it('describes the tools catalog, not the old bookshop or the leather shop', async () => {
      const res = await ctx.request.get('/api/docs.json').expect(200);
      expect(Object.keys(res.body.paths)).toEqual(
        expect.arrayContaining(['/api/v1/products/facets', '/api/v1/products/compare', '/api/v1/categories', '/api/v1/warehouses', '/api/v1/cart/items/{productId}/{sku}', '/api/v1/cart/quote']),
      );
      expect(res.body.components.schemas.ProductInput.properties).toHaveProperty('variants');
      expect(JSON.stringify(res.body)).not.toMatch(/\bisbn\b|"author"|coverImageUrl|leather|colorFamily/i);
    });
  });

  describe('Auth', () => {
    it('register → login → refresh → logout', async () => {
      const email = `flow_${Date.now()}@test.local`;

      const registered = await ctx.request
        .post('/api/v1/auth/register')
        .send({ name: 'Flow User', email, password: 'Password123!' })
        .expect(201);

      expect(registered.body.accessToken).toBeTruthy();
      expect(registered.body.refreshToken).toBeTruthy();
      expect(registered.body.user.email).toBe(email);

      const login = await ctx.request
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' })
        .expect(200);

      const refreshToken = login.body.refreshToken as string;

      const refreshed = await ctx.request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshed.body.accessToken).toBeTruthy();
      expect(refreshed.body.refreshToken).not.toBe(refreshToken);

      await ctx.request
        .post('/api/v1/auth/logout')
        .send({ refreshToken: refreshed.body.refreshToken })
        .expect(200);

      await ctx.request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshed.body.refreshToken })
        .expect(401);
    });

    it('rejects bad login', async () => {
      const res = await ctx.request
        .post('/api/v1/auth/login')
        .send({ email: 'admin@shop-tools.local', password: 'wrong-password' })
        .expect(401);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('login sets httpOnly cookies and a protected route works with the cookie jar', async () => {
      const email = `cookie_${Date.now()}@test.local`;
      await ctx.request
        .post('/api/v1/auth/register')
        .send({ name: 'Cookie User', email, password: 'Password123!' })
        .expect(201);

      const agent = request.agent(ctx.app);
      const login = await agent
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' })
        .expect(200);

      expect(login.body.accessToken).toBeTruthy();
      expect(login.body.refreshToken).toBeTruthy();

      const setCookie = login.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const cookieHeaders = Array.isArray(setCookie) ? setCookie : [setCookie];
      const joined = cookieHeaders.join('\n');
      expect(joined).toMatch(/accessToken=/);
      expect(joined).toMatch(/refreshToken=/);
      expect(joined).toMatch(/HttpOnly/i);

      const me = await agent.get('/api/v1/users/me').expect(200);
      expect(me.body.data.email).toBe(email);

      const refreshed = await agent.post('/api/v1/auth/refresh').send({}).expect(200);
      expect(refreshed.body.accessToken).toBeTruthy();
      expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

      await agent.get('/api/v1/users/me').expect(200);

      await agent.post('/api/v1/auth/logout').send({}).expect(200);

      await agent.get('/api/v1/users/me').expect(401);
    });
  });

  describe('RBAC', () => {
    it('customer cannot hit admin-only routes; admin can', async () => {
      const customer = await registerCustomer(ctx.request, `rbac_${Date.now()}`);

      await ctx.request
        .get('/api/v1/admin/dashboard/summary')
        .set(authHeader(customer.accessToken))
        .expect(403);

      await ctx.request
        .post('/api/v1/products')
        .set(authHeader(customer.accessToken))
        .send({
          title: 'Denied',
          author: 'X',
          description: 'Nope',
          price: 10,
          stock: 1,
        })
        .expect(403);

      const adminSummary = await ctx.request
        .get('/api/v1/admin/dashboard/summary')
        .set(authHeader(ctx.adminToken))
        .expect(200);

      expect(adminSummary.body.data).toBeTruthy();
    });
  });

  describe('Products', () => {
    it('lists, searches, and returns featured products', async () => {
      const list = await ctx.request.get('/api/v1/products').expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);

      const first = list.body.data[0] as { title: string; slug: string };
      const search = await ctx.request.get(`/api/v1/products?q=${encodeURIComponent(first.title)}`).expect(200);
      expect(search.body.data.some((p: { slug: string }) => p.slug === first.slug)).toBe(true);

      const bySlug = await ctx.request.get(`/api/v1/products/slug/${first.slug}`).expect(200);
      expect(bySlug.body.data.slug).toBe(first.slug);

      const facets = await ctx.request.get('/api/v1/products/facets?category=drills').expect(200);
      expect(facets.body.data.specs.length).toBeGreaterThan(0);
      expect(facets.body.data.price.max).toBeGreaterThan(0);

      const featured = await ctx.request.get('/api/v1/products/featured').expect(200);
      expect(featured.body.data.length).toBeGreaterThan(0);
      expect(featured.body.data.every((p: { featured: boolean }) => p.featured === true)).toBe(true);
    });

    it('admin can create and update a product', async () => {
      const created = await ctx.request
        .post('/api/v1/products')
        .set(authHeader(ctx.adminToken))
        .send(newProduct('test-create', 5))
        .expect(201);

      const id = created.body.data.id as string;

      const updated = await ctx.request
        .patch(`/api/v1/products/${id}`)
        .set(authHeader(ctx.adminToken))
        .send({ price: 2150, variants: [{ sku: created.body.data.variants[0].sku, label: 'Standard', stock: { BER: 8 } }] })
        .expect(200);

      expect(updated.body.data.price).toBe(2150);
      expect(updated.body.data.stock).toBe(8);
    });
  });

  describe('Cart & orders', () => {
    it('add → update → checkout → pending_payment; pay decrements stock', async () => {
      const products = await ctx.request.get('/api/v1/products?limit=1&inStock=true').expect(200);
      const productId = products.body.data[0].id as string;
      const productPrice = products.body.data[0].price as number;
      const sku = inStockSku(products.body.data[0], 2);

      const customer = await registerCustomer(ctx.request, `cart_${Date.now()}`);
      const token = customer.accessToken;

      const beforeProduct = await ctx.request.get(`/api/v1/products/${productId}`).expect(200);
      const stockBefore = beforeProduct.body.data.stock as number;

      await ctx.request
        .post('/api/v1/cart/items')
        .set(authHeader(token))
        .send({ productId, sku, quantity: 1 })
        .expect(201);

      await ctx.request
        .patch(`/api/v1/cart/items/${productId}/${sku}`)
        .set(authHeader(token))
        .send({ quantity: 2 })
        .expect(200);

      const checkout = await ctx.request
        .post('/api/v1/cart/checkout')
        .set(authHeader(token))
        .send({ shippingAddress })
        .expect(201);

      const order = checkout.body.data;
      expect(order.status).toBe('pending_payment');
      expect(order.totalAmount).toBe(productPrice * 2);
      expect(order.items[0]).toMatchObject({ sku, quantity: 2 });

      const paid = await ctx.request
        .post(`/api/v1/orders/${order.id}/pay`)
        .set(authHeader(token))
        .expect(200);

      expect(paid.body.data.status).toBe('paid');

      const afterProduct = await ctx.request.get(`/api/v1/products/${productId}`).expect(200);
      expect(afterProduct.body.data.stock).toBe(stockBefore - 2);
    });

    it('out-of-stock pay fails when concurrent orders oversell', async () => {
      const created = await ctx.request
        .post('/api/v1/products')
        .set(authHeader(ctx.adminToken))
        .send(newProduct('scarce', 1))
        .expect(201);

      const scarceId = created.body.data.id as string;
      const scarceSku = created.body.data.variants[0].sku as string;
      const c1 = await registerCustomer(ctx.request, `oos1_${Date.now()}`);
      const c2 = await registerCustomer(ctx.request, `oos2_${Date.now()}`);

      for (const c of [c1, c2]) {
        await ctx.request
          .post('/api/v1/cart/items')
          .set(authHeader(c.accessToken))
          .send({ productId: scarceId, sku: scarceSku, quantity: 1 })
          .expect(201);

        await ctx.request
          .post('/api/v1/cart/checkout')
          .set(authHeader(c.accessToken))
          .send({ shippingAddress })
          .expect(201);
      }

      const orders1 = await ctx.request.get('/api/v1/orders').set(authHeader(c1.accessToken)).expect(200);
      const orders2 = await ctx.request.get('/api/v1/orders').set(authHeader(c2.accessToken)).expect(200);
      const order1Id = orders1.body.data[0].id as string;
      const order2Id = orders2.body.data[0].id as string;

      await ctx.request
        .post(`/api/v1/orders/${order1Id}/pay`)
        .set(authHeader(c1.accessToken))
        .expect(200);

      const fail = await ctx.request
        .post(`/api/v1/orders/${order2Id}/pay`)
        .set(authHeader(c2.accessToken))
        .expect(409);

      expect(fail.body.message).toMatch(/insufficient stock/i);

      const failedOrder = await ctx.request
        .get(`/api/v1/orders/${order2Id}`)
        .set(authHeader(c2.accessToken))
        .expect(200);
      expect(failedOrder.body.data.status).toBe('failed');
    });
  });

  describe('Guest cart', () => {
    it('visitor adds to cart, signs in, and the cart is merged', async () => {
      const products = await ctx.request.get('/api/v1/products?limit=20&inStock=true').expect(200);
      const product = products.body.data.find((p: { variants: { stock: number }[] }) =>
        p.variants.some((v) => v.stock >= 1),
      );
      const sku = inStockSku(product, 1);

      const visitor = request.agent(ctx.app);
      const added = await visitor
        .post('/api/v1/cart/items')
        .send({ productId: product.id, sku, quantity: 1 })
        .expect(201);
      expect(added.headers['set-cookie']?.toString()).toMatch(/guestCart=/);
      expect(added.body.data).toMatchObject({ count: 1, subtotal: product.price });
      expect(added.body.data.items[0]).toMatchObject({ sku, slug: product.slug });

      // the cookie keeps the same cart
      const again = await visitor.get('/api/v1/cart').expect(200);
      expect(again.body.data.count).toBe(1);

      // checkout needs an account
      await visitor.post('/api/v1/cart/checkout').send({ shippingAddress }).expect(401);

      const email = `guest_${Date.now()}@test.local`;
      await visitor
        .post('/api/v1/auth/register')
        .send({ name: 'Guest Buyer', email, password: 'Password123!' })
        .expect(201);
      await visitor.post('/api/v1/auth/login').send({ email, password: 'Password123!' }).expect(200);

      const merged = await visitor.post('/api/v1/cart/merge').expect(200);
      expect(merged.body.data.count).toBe(1);
      expect(merged.headers['set-cookie']?.toString()).toMatch(/guestCart=;/);

      const mine = await visitor.get('/api/v1/cart').expect(200);
      expect(mine.body.data.items[0].sku).toBe(sku);

      const quote = await visitor.post('/api/v1/cart/quote').send({}).expect(200);
      expect(quote.body.data).toMatchObject({ discountAmount: 0, total: quote.body.data.subtotal });
      await visitor.post('/api/v1/cart/quote').send({ discountCode: 'NOPE' }).expect(400);
    });
  });

  describe('Favorites', () => {
    it('add → list → remove', async () => {
      const customer = await registerCustomer(ctx.request, `fav_${Date.now()}`);
      const products = await ctx.request.get('/api/v1/products?limit=1').expect(200);
      const productId = products.body.data[0].id as string;

      await ctx.request
        .post('/api/v1/favorites')
        .set(authHeader(customer.accessToken))
        .send({ productId })
        .expect(201);

      const list = await ctx.request
        .get('/api/v1/favorites')
        .set(authHeader(customer.accessToken))
        .expect(200);

      expect(list.body.data.some((f: { productId: string }) => f.productId === productId)).toBe(true);

      await ctx.request
        .delete(`/api/v1/favorites/${productId}`)
        .set(authHeader(customer.accessToken))
        .expect(200);

      const after = await ctx.request
        .get('/api/v1/favorites')
        .set(authHeader(customer.accessToken))
        .expect(200);

      expect(after.body.data.length).toBe(0);
    });
  });

  describe('Discounts', () => {
    it('applies WELCOME10 on checkout and rejects invalid codes', async () => {
      const customer = await registerCustomer(ctx.request, `disc_${Date.now()}`);
      const products = await ctx.request.get('/api/v1/products?limit=20&inStock=true').expect(200);
      // WELCOME10 needs a $50 subtotal
      const product = products.body.data.find((b: { price: number }) => b.price >= 5000);
      const sku = inStockSku(product, 1);
      const qty = 1;

      await ctx.request
        .post('/api/v1/cart/items')
        .set(authHeader(customer.accessToken))
        .send({ productId: product.id, sku, quantity: qty })
        .expect(201);

      const checkout = await ctx.request
        .post('/api/v1/cart/checkout')
        .set(authHeader(customer.accessToken))
        .send({ shippingAddress, discountCode: 'WELCOME10' })
        .expect(201);

      expect(checkout.body.data.discountCode).toBe('WELCOME10');
      expect(checkout.body.data.discountAmount).toBeGreaterThan(0);
      expect(checkout.body.data.totalAmount).toBeLessThan(checkout.body.data.subtotalAmount);

      const customer2 = await registerCustomer(ctx.request, `disc_bad_${Date.now()}`);
      await ctx.request
        .post('/api/v1/cart/items')
        .set(authHeader(customer2.accessToken))
        .send({ productId: product.id, sku, quantity: 1 })
        .expect(201);

      const bad = await ctx.request
        .post('/api/v1/cart/checkout')
        .set(authHeader(customer2.accessToken))
        .send({ shippingAddress, discountCode: 'NOTAREALCODE' })
        .expect(400);

      expect(bad.body.message).toMatch(/invalid discount/i);
    });
  });

  describe('Reviews', () => {
    it('allows multiple reviews from the same user for the same product', async () => {
      const customer = await registerCustomer(ctx.request, `rev_${Date.now()}`);
      const products = await ctx.request.get('/api/v1/products?limit=1').expect(200);
      const productId = products.body.data[0].id as string;

      const r1 = await ctx.request
        .post('/api/v1/reviews')
        .set(authHeader(customer.accessToken))
        .send({ product: productId, rating: 5, comment: 'First review' })
        .expect(201);

      const r2 = await ctx.request
        .post('/api/v1/reviews')
        .set(authHeader(customer.accessToken))
        .send({ product: productId, rating: 4, comment: 'Second review same product' })
        .expect(201);

      const id1 = (r1.body.id ?? r1.body.data?.id) as string;
      const id2 = (r2.body.id ?? r2.body.data?.id) as string;
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);

      // the product's rating follows its reviews
      const product = await ctx.request.get(`/api/v1/products/${productId}`).expect(200);
      expect(product.body.data.ratingCount).toBe(2);
      expect(product.body.data.ratingAvg).toBe(4.5);

      // the public list shows the reviewer's name, not the email
      const list = await ctx.request.get(`/api/v1/reviews?product=${productId}`).expect(200);
      expect(list.body.data[0].user.name).toBeTruthy();
      expect(list.body.data[0].user.email).toBeUndefined();
    });
  });

  describe('Admin dashboard', () => {
    it('summary is reachable by admin', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/dashboard/summary')
        .set(authHeader(ctx.adminToken))
        .expect(200);

      expect(res.body.data).toBeTruthy();
    });
  });

  describe('Uploads', () => {
    it('rejects unauthenticated and unauthorized upload attempts', async () => {
      await ctx.request.post('/api/v1/uploads/product-cover').expect(401);

      const customer = await registerCustomer(ctx.request, `upl_${Date.now()}`);
      await ctx.request
        .post('/api/v1/uploads/product-cover')
        .set(authHeader(customer.accessToken))
        .expect(403);
    });

    it('stores real images under a safe name and rejects disguised files', async () => {
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      );
      const ok = await ctx.request
        .post('/api/v1/uploads/product-cover')
        .set(authHeader(ctx.adminToken))
        .attach('file', png, { filename: 'evil.html', contentType: 'image/png' })
        .expect(201);
      expect(ok.body.url).toMatch(/\/[0-9]+-[0-9a-f]{12}\.png$/);

      const served = await ctx.request.get(new URL(ok.body.url, 'http://x').pathname).expect(200);
      expect(served.headers['x-content-type-options']).toBe('nosniff');
      expect(served.headers['content-security-policy']).toContain('sandbox');

      await ctx.request
        .post('/api/v1/uploads/product-cover')
        .set(authHeader(ctx.adminToken))
        .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' })
        .expect(400);
    });
  });
});
