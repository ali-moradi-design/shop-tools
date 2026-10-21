import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../../../src/shared/config/env', () => ({
  resolveCorsOrigin: () => 'https://shop.example.com',
}));

const { originCheck } = await import('../../../src/shared/http/middleware/originCheck');

function run(req: Partial<Request>): unknown {
  const next = vi.fn() as unknown as NextFunction & { mock: { calls: unknown[][] } };
  originCheck({ method: 'POST', headers: {}, ...req } as Request, {} as Response, next);
  return next.mock.calls[0][0];
}

describe('originCheck (CSRF guard)', () => {
  it('blocks a cookie write from another origin', () => {
    const err = run({ headers: { cookie: 'accessToken=x', origin: 'https://evil.example.com' } });
    expect(err).toMatchObject({ statusCode: 403 });
  });

  it('checks the Referer when there is no Origin', () => {
    const err = run({ headers: { cookie: 'a=1', referer: 'https://evil.example.com/page' } });
    expect(err).toMatchObject({ statusCode: 403 });
  });

  it('allows the storefront origin, bearer clients, reads and cookieless calls', () => {
    expect(run({ headers: { cookie: 'a=1', origin: 'https://shop.example.com' } })).toBeUndefined();
    expect(run({ headers: { cookie: 'a=1', origin: 'https://evil.example.com', authorization: 'Bearer t' } })).toBeUndefined();
    expect(run({ method: 'GET', headers: { cookie: 'a=1', origin: 'https://evil.example.com' } })).toBeUndefined();
    expect(run({ headers: { origin: 'https://evil.example.com' } })).toBeUndefined();
  });
});
