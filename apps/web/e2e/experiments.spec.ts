import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

test('a first visit gets a visitor id and a sticky variant before the page renders', async ({ page }) => {
  const res = await page.goto('/');
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'tb_vid')?.value).toMatch(/^[a-f0-9]{32}$/);
  expect(['control', 'benefits']).toContain(cookies.find((c) => c.name === 'ab_pdp-cta')?.value);
  expect(res!.headers()['content-security-policy']).toContain('nonce-');
  // a second visit keeps both
  await page.goto('/');
  const again = await page.context().cookies();
  expect(again.find((c) => c.name === 'tb_vid')?.value).toBe(cookies.find((c) => c.name === 'tb_vid')?.value);
});

test('the benefits variant shows the promise; exposure and add-to-cart reach the results page', async ({ browser, request }) => {
  const visitor = `e2e${Date.now()}`.padEnd(20, '0');
  const context = await browser.newContext();
  await context.addCookies([
    { name: 'tb_vid', value: visitor, url: 'http://localhost:3000' },
    { name: 'ab_pdp-cta', value: 'benefits', url: 'http://localhost:3000' },
  ]);
  const page = await context.newPage();
  const { data } = await (await request.get(`${API}/products?limit=1&inStock=true&category=drills`)).json();
  await page.goto(`/products/${data[0].slug}`, { waitUntil: 'networkidle' });
  const main = page.locator('#main');
  await expect(main.getByRole('list', { name: 'With every order' })).toBeVisible();
  await main.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();

  const admin = await (await browser.newContext()).newPage();
  await admin.goto('/account/login?next=/admin/experiments');
  await admin.getByLabel('Email', { exact: true }).fill('admin@shop-tools.local');
  await admin.getByLabel('Password').fill('Admin123!');
  await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(admin).toHaveURL(/admin\/experiments/);
  const row = admin.locator('#main').getByTestId('experiment').filter({ hasText: 'pdp-cta' }).getByRole('row', { name: /benefits/ });
  await expect(row).toBeVisible();
  const axe = await new AxeBuilder({ page: admin }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});
