import { expect, test } from '@playwright/test';

const count = async (page: import('@playwright/test').Page) => {
  // during a client-side navigation the old and the new list can coexist for a moment: read until there is one
  let total = 0;
  await expect(async () => {
    const texts = await page.getByTestId('result-count').allInnerTexts();
    expect(texts).toHaveLength(1);
    total = Number((texts[0].match(/\d+/) ?? ['0'])[0]);
  }).toPass();
  return total;
};

test('spec filters: a range with a unit narrows the list and the unit can be switched', async ({ page }) => {
  await page.goto('/categories/drills');
  const all = await count(page);
  expect(all).toBeGreaterThan(3);

  // a word filter (checkboxes) lives in the URL
  await page.locator('aside[aria-label="Filters"]').getByRole('checkbox', { name: /^Brushless/ }).click();
  await expect(page).toHaveURL(/spec\.motor=Brushless/);
  await expect.poll(() => count(page)).toBeLessThan(all); // the list is re-rendered on the server
  await expect(page.getByTestId('active-filters')).toBeVisible();

  // a number range with a unit: the API converts in·lb to Nm
  await page.goto('/categories/drills?spec.torque=400..900in·lb');
  const inLb = await count(page);
  expect(inLb).toBeGreaterThan(0);
  expect(inLb).toBeLessThan(all);
  await page.goto('/categories/drills?spec.torque=45..101.7Nm'); // the same range in Nm
  expect(await count(page)).toBe(inLb);

  // switching the unit keeps the same physical range
  await page.getByRole('group', { name: 'Max torque unit' }).getByRole('button', { name: 'in·lb' }).click();
  await expect(page).toHaveURL(/in%C2%B7lb|in·lb/);
  expect(await count(page)).toBe(inLb);
});

test('bad filter input never breaks the page', async ({ page }) => {
  const res = await page.goto('/categories/drills?spec.torque=abc..;DROP&price=x..y&sort=nope&evil=1');
  expect(res?.status()).toBe(200);
  await expect(page.getByTestId('invalid-filters')).toBeVisible();
});

test('compare: pick two tools, open the table, best values are marked', async ({ page }) => {
  await page.goto('/categories/drills');
  await expect(page.getByTestId('compare-tray')).toBeHidden();
  await page.getByTestId('product-card').nth(0).getByTestId('compare-toggle').click();
  await page.getByTestId('product-card').nth(1).getByTestId('compare-toggle').click();
  await expect(page.getByTestId('compare-count')).toHaveText('2');
  await expect(page.getByTestId('compare-tray')).toBeVisible();

  await page.getByTestId('compare-now').click();
  await expect(page).toHaveURL(/\/compare\?slugs=/);
  const table = page.getByTestId('compare-table');
  await expect(table).toBeVisible();
  await expect(table.getByText('Max torque')).toBeVisible();
  await expect(table.locator('[data-best="true"]').first()).toBeVisible();
});

test('compare: at most four tools of one category', async ({ page }) => {
  await page.goto('/categories/drills');
  const toggles = page.getByTestId('product-card').getByTestId('compare-toggle');
  for (let i = 0; i < 5; i++) await toggles.nth(i).click();
  await expect(page.getByTestId('compare-count')).toHaveText('4');
  await expect(page.getByText(/up to 4 tools/i)).toBeVisible();
});

test('the API refuses to compare tools of different categories', async ({ request }) => {
  const API = process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1';
  const a = (await (await request.get(`${API}/products?category=drills&limit=1`)).json()).data[0];
  const b = (await (await request.get(`${API}/products?category=saws&limit=1`)).json()).data[0];
  const res = await request.get(`${API}/products/compare?slugs=${a.slug},${b.slug}`);
  expect(res.status()).toBe(400);
});
