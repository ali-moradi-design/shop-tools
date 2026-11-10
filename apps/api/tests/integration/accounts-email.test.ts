import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/shared/infra/prisma/client';
import { authHeader, registerCustomer, setupTestApp, shippingAddress, teardownTestApp, type TestContext } from '../helpers/testApp';

const tokenIn = (text: string) => /token=([a-f0-9]+)/.exec(text)?.[1];

async function lastEmail(to: string, template?: string) {
  return prisma.emailMessage.findFirst({ where: { to: to.toLowerCase(), ...(template ? { template } : {}) }, orderBy: { createdAt: 'desc' } });
}

describe('Accounts, email outbox and newsletter', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  it('sends a welcome email on sign-up, kept in the outbox for staff', async () => {
    const c = await registerCustomer(ctx.request);
    const mail = await lastEmail(c.email, 'welcome');
    expect(mail?.status).toBe('outbox');
    const outbox = await ctx.request.get(`/api/v1/emails?to=${encodeURIComponent(c.email)}`).set(authHeader(ctx.adminToken)).expect(200);
    expect(outbox.body.meta.transport).toBe('outbox');
    expect(outbox.body.data[0]).toMatchObject({ template: 'welcome', to: c.email.toLowerCase() });
    await ctx.request.get('/api/v1/emails').set(authHeader(c.accessToken)).expect(403);
  });

  it('resets a password with a one-time link and signs out other sessions', async () => {
    const c = await registerCustomer(ctx.request);
    // unknown addresses get the same answer
    await ctx.request.post('/api/v1/auth/forgot-password').send({ email: 'nobody@test.local' }).expect(202);
    await ctx.request.post('/api/v1/auth/forgot-password').send({ email: c.email }).expect(202);
    const token = tokenIn((await lastEmail(c.email, 'password-reset'))!.text)!;
    expect(token).toBeTruthy();

    await ctx.request.post('/api/v1/auth/reset-password').send({ token, password: 'Brand-new-pass1' }).expect(200);
    await ctx.request.post('/api/v1/auth/reset-password').send({ token, password: 'Another-pass-2' }).expect(400);
    await ctx.request.post('/api/v1/auth/refresh').send({ refreshToken: c.refreshToken }).expect(401);
    await ctx.request.post('/api/v1/auth/login').send({ email: c.email, password: 'Brand-new-pass1' }).expect(200);
    expect((await lastEmail(c.email))?.template).toBe('password-changed');
  });

  it('guest checkout: signed in at once; the same email never signs in a second time', async () => {
    const email = `guest_${Date.now()}@test.local`;
    const agent = request.agent(ctx.app);
    const res = await agent.post('/api/v1/auth/guest').send({ name: 'Gus Guest', email }).expect(201);
    expect(res.body.user).toMatchObject({ guest: true, email });
    expect(res.headers['set-cookie']?.toString()).toMatch(/accessToken=/);
    const me = await agent.get('/api/v1/account').expect(200);
    expect(me.body.data).toMatchObject({ guest: true, addresses: [] });
    expect((await lastEmail(email, 'guest-welcome'))?.text).toMatch(/reset-password\?token=/);

    const again = await ctx.request.post('/api/v1/auth/guest').send({ name: 'Gus Guest', email }).expect(409);
    expect(again.body.message).toMatch(/emailed you a link/);
    expect(again.headers['set-cookie']).toBeUndefined();
    // a real account is never taken over this way
    await ctx.request.post('/api/v1/auth/guest').send({ name: 'Admin', email: 'admin@shop-tools.local' }).expect(409);
    // a guest has no password to sign in with
    await ctx.request.post('/api/v1/auth/login').send({ email, password: 'whatever-123' }).expect(401);
  });

  it('changing the email needs the current password; changing the password keeps this session', async () => {
    const c = await registerCustomer(ctx.request);
    const auth = authHeader(c.accessToken);
    await ctx.request.patch('/api/v1/account').set(auth).send({ name: 'New Name' }).expect(200);
    const wrong = await ctx.request.patch('/api/v1/account').set(auth).send({ email: `x_${Date.now()}@test.local`, currentPassword: 'nope' }).expect(400);
    expect(wrong.body.errors).toMatchObject({ fieldErrors: { currentPassword: 'Incorrect password' } });
    await ctx.request.patch('/api/v1/account').set(auth).send({ email: 'admin@shop-tools.local', currentPassword: 'Customer123!' }).expect(409);
    const newEmail = `moved_${Date.now()}@test.local`;
    const moved = await ctx.request.patch('/api/v1/account').set(auth).send({ email: newEmail, currentPassword: 'Customer123!' }).expect(200);
    expect(moved.body.data).toMatchObject({ name: 'New Name', email: newEmail });

    const other = await ctx.request.post('/api/v1/auth/login').send({ email: newEmail, password: 'Customer123!' }).expect(200);
    await ctx.request.post('/api/v1/account/password').set(auth).send({ currentPassword: 'wrong', newPassword: 'Changed-pass-9' }).expect(400);
    await ctx.request
      .post('/api/v1/account/password')
      .set(auth)
      .send({ currentPassword: 'Customer123!', newPassword: 'Changed-pass-9', refreshToken: c.refreshToken })
      .expect(200);
    await ctx.request.post('/api/v1/auth/refresh').send({ refreshToken: c.refreshToken }).expect(200);
    await ctx.request.post('/api/v1/auth/refresh').send({ refreshToken: other.body.refreshToken }).expect(401);
  });

  it('keeps an address book with one default, no duplicates and at most 10', async () => {
    const c = await registerCustomer(ctx.request);
    const auth = authHeader(c.accessToken);
    const home = { ...shippingAddress, label: 'Home' };
    let list = (await ctx.request.post('/api/v1/account/addresses').set(auth).send(home).expect(201)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0].isDefault).toBe(true);
    // the same address again is not a second entry
    list = (await ctx.request.post('/api/v1/account/addresses').set(auth).send({ ...home, city: home.city.toUpperCase() }).expect(201)).body.data;
    expect(list).toHaveLength(1);
    list = (await ctx.request.post('/api/v1/account/addresses').set(auth).send({ ...home, line1: '2 Shop Lane', isDefault: true }).expect(201)).body.data;
    expect(list.map((a: { isDefault: boolean }) => a.isDefault)).toEqual([false, true]);
    list = (await ctx.request.delete(`/api/v1/account/addresses/${list[1].id}`).set(auth).expect(200)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0].isDefault).toBe(true);
    for (let i = 0; i < 9; i++) await ctx.request.post('/api/v1/account/addresses').set(auth).send({ ...home, line1: `${i + 10} Road` }).expect(201);
    await ctx.request.post('/api/v1/account/addresses').set(auth).send({ ...home, line1: '99 Road' }).expect(400);
    // another customer cannot touch these
    const other = await registerCustomer(ctx.request);
    await ctx.request.delete(`/api/v1/account/addresses/${list[0].id}`).set(authHeader(other.accessToken)).expect(404);
  });

  it('newsletter: same answer for new and existing addresses; unsubscribe with the token', async () => {
    const email = `news_${Date.now()}@test.local`;
    await ctx.request.post('/api/v1/newsletter').send({ email }).expect(202);
    await ctx.request.post('/api/v1/newsletter').send({ email }).expect(202);
    expect(await prisma.emailMessage.count({ where: { to: email, template: 'newsletter-welcome' } })).toBe(1);
    const token = tokenIn((await lastEmail(email, 'newsletter-welcome'))!.text)!;
    const list = await ctx.request.get('/api/v1/newsletter').set(authHeader(ctx.adminToken)).expect(200);
    expect(list.body.data.some((s: { email: string }) => s.email === email)).toBe(true);
    await ctx.request.post('/api/v1/newsletter/unsubscribe').send({ token }).expect(200);
    await ctx.request.post('/api/v1/newsletter/unsubscribe').send({ token }).expect(200);
    await ctx.request.post('/api/v1/newsletter/unsubscribe').send({ token: 'a'.repeat(48) }).expect(404);
    const after = await ctx.request.get('/api/v1/newsletter').set(authHeader(ctx.adminToken)).expect(200);
    expect(after.body.data.some((s: { email: string }) => s.email === email)).toBe(false);
  });

  it('emails the customer when an order is paid', async () => {
    const c = await registerCustomer(ctx.request);
    const products = await ctx.request.get('/api/v1/products?limit=1&inStock=true').expect(200);
    const p = products.body.data[0];
    const sku = p.variants.find((v: { stock: number }) => v.stock > 0).sku;
    await ctx.request.post('/api/v1/cart/items').set(authHeader(c.accessToken)).send({ productId: p.id, sku, quantity: 1 }).expect(201);
    const order = (await ctx.request.post('/api/v1/cart/checkout').set(authHeader(c.accessToken)).send({ shippingAddress }).expect(201)).body.data;
    await ctx.request.post(`/api/v1/orders/${order.id}/pay`).set(authHeader(ctx.adminToken)).expect(200);
    const mail = await lastEmail(c.email, 'order-confirmed');
    expect(mail?.subject).toContain(order.id.slice(-6).toUpperCase());
  });
});
