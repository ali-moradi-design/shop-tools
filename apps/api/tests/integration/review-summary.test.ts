import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authHeader, registerCustomer, setupTestApp, teardownTestApp, type TestContext } from '../helpers/testApp';

describe('Review summary', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  it('counts reviews per star and matches the average', async () => {
    const products = await ctx.request.get('/api/v1/products?limit=1&sort=title&order=desc').expect(200);
    const id = products.body.data[0].id as string;
    const before = await ctx.request.get(`/api/v1/reviews/summary?product=${id}`).expect(200);
    const c = await registerCustomer(ctx.request);
    for (const rating of [5, 5, 2]) {
      await ctx.request.post('/api/v1/reviews').set(authHeader(c.accessToken)).send({ product: id, rating }).expect(201);
    }
    const { data } = (await ctx.request.get(`/api/v1/reviews/summary?product=${id}`).expect(200)).body;
    expect(data.count).toBe(before.body.data.count + 3);
    expect(data.stars[4] - before.body.data.stars[4]).toBe(2);
    expect(data.stars[1] - before.body.data.stars[1]).toBe(1);
    expect(data.stars.reduce((a: number, b: number) => a + b, 0)).toBe(data.count);
    const avg = data.stars.reduce((s: number, n: number, i: number) => s + n * (i + 1), 0) / data.count;
    expect(data.avg).toBeCloseTo(Math.round(avg * 10) / 10, 5);

    await ctx.request.get('/api/v1/reviews/summary').expect(400);
  });
});
