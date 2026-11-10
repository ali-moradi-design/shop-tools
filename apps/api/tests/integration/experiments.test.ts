import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pValue } from '../../src/modules/reporting/experiments';
import { authHeader, setupTestApp, teardownTestApp, type TestContext } from '../helpers/testApp';

describe('A/B test events and results', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  }, 120_000);

  afterAll(async () => {
    await teardownTestApp();
  }, 60_000);

  const visitor = (i: number) => `visitor${String(i).padStart(12, '0')}`;
  const post = (v: string, events: object[]) => ctx.request.post('/api/v1/experiments/events').send({ visitor: v, events });

  it('counts unique visitors per variant; the first variant recorded wins', async () => {
    for (let i = 0; i < 10; i++) await post(visitor(i), [{ experiment: 'test-x', variant: i < 5 ? 'control' : 'benefits', type: 'exposure' }]).expect(204);
    for (const i of [0, 5, 6, 7]) await post(visitor(i), [{ experiment: 'test-x', variant: i < 5 ? 'control' : 'benefits', type: 'add_to_cart' }]).expect(204);
    // repeats and a switched cookie do not count again
    await post(visitor(0), [{ experiment: 'test-x', variant: 'benefits', type: 'exposure' }, { experiment: 'test-x', variant: 'control', type: 'add_to_cart' }]).expect(204);

    const { data } = (await ctx.request.get('/api/v1/experiments/results').set(authHeader(ctx.adminToken)).expect(200)).body;
    const x = data.find((e: { key: string }) => e.key === 'test-x');
    const [control, benefits] = x.variants;
    expect(control).toMatchObject({ name: 'control', visitors: 5, addToCart: 1, addToCartRate: 0.2 });
    expect(benefits).toMatchObject({ name: 'benefits', visitors: 5, addToCart: 3, addToCartRate: 0.6 });
    expect(benefits.addToCartVsControl.uplift).toBeCloseTo(2, 5);
    expect(benefits.addToCartVsControl.pValue).toBeGreaterThan(0);
  });

  it('refuses bad input and keeps results for staff', async () => {
    await post('short', [{ experiment: 'x', variant: 'control', type: 'exposure' }]).expect(400);
    await post(visitor(99), [{ experiment: 'x', variant: 'control', type: 'click' }]).expect(400);
    await ctx.request.get('/api/v1/experiments/results').expect(401);
  });

  it('computes a two-proportion p-value', () => {
    expect(pValue(10, 100, 10, 100)).toBeCloseTo(1, 3);
    expect(pValue(50, 1000, 80, 1000)!).toBeLessThan(0.01);
    expect(pValue(0, 0, 1, 10)).toBeNull();
  });
});
