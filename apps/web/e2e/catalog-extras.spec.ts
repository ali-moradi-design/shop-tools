import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

test('header search suggests products and opens one with the keyboard', async ({ page, request }) => {
  const { data } = await (await request.get(`${API}/products?limit=1&sort=rating&order=desc`)).json();
  const word = (data[0].title as string).split(/\s+/).find((w) => /^[a-z]{4,}$/i.test(w))!.slice(0, 4);
  await page.goto('/', { waitUntil: 'networkidle' });
  const box = page.getByRole('combobox', { name: 'Search tools, SKUs or specs' });
  await box.fill(word);
  const list = page.getByRole('listbox', { name: 'Suggestions' });
  await expect(list.getByRole('option').first()).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
  await box.press('ArrowDown');
  await expect(box).toHaveAttribute('aria-activedescendant', /.+/);
  const first = (await list.getByRole('option').first().innerText()).split('\n')[0];
  await box.press('Enter');
  await expect(page).toHaveURL(/\/products\//);
  await expect(page.locator('#main').getByRole('heading', { level: 1 })).toContainText(first.slice(0, 15));

  // Escape closes the list; plain Enter still searches
  await box.fill(word);
  await expect(list.getByRole('option').first()).toBeVisible();
  await box.press('Escape');
  await expect(list).toBeHidden();
  await box.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${word}`, 'i'));
});

test('a sold-out product offers a back-in-stock email', async ({ page, request }) => {
  const { data } = await (await request.get(`${API}/products?limit=1&inStock=false`)).json();
  test.skip(!data.length, 'no sold-out product in the seed');
  await page.goto(`/products/${data[0].slug}`, { waitUntil: 'networkidle' });
  const main = page.locator('#main');
  await main.getByRole('button', { name: 'Sold out? Get an email when it is back' }).click();
  const form = main.getByRole('form', { name: 'Back in stock alert' });
  if (await form.getByLabel('Option').count()) await form.getByLabel('Option').selectOption({ index: 1 });
  await form.getByLabel('Email').fill(`notify_${Date.now()}@test.local`);
  await form.getByRole('button', { name: 'Notify me' }).click();
  await expect(main.getByRole('status').filter({ hasText: 'We will email you' })).toBeVisible();
});
