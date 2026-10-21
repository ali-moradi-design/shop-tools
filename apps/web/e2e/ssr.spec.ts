import { expect, test } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';

test('every page is rendered per request with its own CSP nonce and is not cached', async ({ page }) => {
  const first = await page.goto('/about');
  const csp = first!.headers()['content-security-policy'] ?? '';
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonce, 'CSP header carries a nonce').toBeTruthy();
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(first!.headers()['cache-control'] ?? '').toMatch(/no-store|no-cache|private/);

  // Next.js put the nonce on every script in the HTML it sent (JSON-LD data blocks never execute).
  // The server's HTML is checked, not the live DOM: scripts added later by the loader are allowed by the browser through the nonce too.
  const html = await first!.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]).filter((tag) => !tag.includes('application/ld+json'));
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.filter((tag) => !tag.includes(`nonce="${nonce}"`))).toEqual([]);

  const second = await page.goto('/about');
  const nonce2 = /'nonce-([^']+)'/.exec(second!.headers()['content-security-policy'] ?? '')?.[1];
  expect(nonce2).toBeTruthy();
  expect(nonce2).not.toBe(nonce);
});

test('a price change shows on the very next page view (nothing is cached)', async ({ page, request }) => {
  const login = await request.post(`${API}/auth/login`, {
    data: { email: 'admin@shop-tools.local', password: 'Admin123!' },
  });
  const token = (await login.json()).accessToken as string;
  const headers = { Authorization: `Bearer ${token}` };

  const list = await (await request.get(`${API}/products?limit=1`)).json();
  const product = list.data[0] as { id: string; slug: string; price: number };

  const setPrice = (price: number) => request.patch(`${API}/products/${product.id}`, { headers, data: { price } });
  try {
    expect((await setPrice(98765)).ok()).toBe(true);
    await page.goto(`/products/${product.slug}`);
    await expect(page.getByText('$987.65').first()).toBeVisible();

    expect((await setPrice(43210)).ok()).toBe(true);
    await page.goto(`/products/${product.slug}`);
    await expect(page.getByText('$432.10').first()).toBeVisible();
  } finally {
    await setPrice(product.price);
  }
});
