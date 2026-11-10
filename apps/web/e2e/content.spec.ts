import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the shop stays out of search engines', async ({ page, request }) => {
  const res = await page.goto('/');
  expect(res!.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/User-Agent: \*\s+Allow: \//i);
  expect(robots).toMatch(/User-Agent: GPTBot[\s\S]*Disallow: \//i);
  expect(robots).not.toContain('Sitemap');
  expect((await request.get('/sitemap.xml')).status()).toBe(404);

  const api = await request.get('http://localhost:4000/robots.txt');
  expect(await api.text()).toContain('Disallow: /');
  expect(api.headers()['x-robots-tag']).toContain('noindex');
});

test('help: the FAQ search filters questions and answers', async ({ page }) => {
  await page.goto('/help', { waitUntil: 'networkidle' });
  const main = page.locator('#main');
  await main.getByLabel('Search the questions').fill('tracking');
  await expect(main.getByText(/^\d+ answers?$/)).toBeVisible();
  await expect(main.getByRole('group').filter({ hasText: 'Where is my parcel?' })).toBeVisible();
  await expect(main.getByText('How many tools can I compare?')).toBeHidden();
  await main.getByLabel('Search the questions').fill('zzzz');
  await expect(main.getByText('Nothing matches')).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});
