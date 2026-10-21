import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';

const PAGES = ['/', '/categories/drills', '/account/login', '/help', '/compare'];

test('no serious accessibility violations on a product page', async ({ page, request }) => {
  const list = await (await request.get(`${API}/products?category=drills&limit=1`)).json();
  await page.goto(`/products/${list.data[0].slug}`);
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

for (const path of PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('cart drawer is an accessible dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('cart-button').click();
  const dialog = page.getByRole('dialog', { name: 'Your Cart' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
