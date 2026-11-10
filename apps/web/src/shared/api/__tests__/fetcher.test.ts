import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../visitor-ip', () => ({ visitorIpHeaders: async () => ({}) }));

const { apiGetJson } = await import('../fetcher');
const { ApiError } = await import('../types');

afterEach(() => vi.unstubAllGlobals());

describe('apiGetJson errors', () => {
  it('turns a plain-text error (a proxy page, a crash) into an ApiError instead of "Body is unusable"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })));
    const err = await apiGetJson('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, message: '<html>Bad gateway</html>' });
  });

  it('uses the message of a JSON error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'Product not found' }, { status: 404 })));
    await expect(apiGetJson('/x')).rejects.toMatchObject({ status: 404, message: 'Product not found' });
  });
});
