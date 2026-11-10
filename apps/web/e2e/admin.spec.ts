import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@shop-tools.local', password: 'Admin123!' };

async function signIn(page: Page, next: string) {
  await page.goto(`/account/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[/?]/g, '\\$&')));
}

test('admin products: filter, sort, bulk feature, trash and restore', async ({ page }) => {
  await signIn(page, '/admin/products');
  await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Products' })).toHaveAttribute('aria-current', 'page');
  const rows = page.getByTestId('admin-product');
  await expect(rows.first()).toBeVisible();

  // sold-out filter: every row says so
  await page.getByRole('combobox', { name: 'Stock' }).selectOption('out');
  await page.getByRole('button', { name: 'Filter' }).click();
  await expect(page).toHaveURL(/stock=out/);
  const soldOut = await rows.count();
  for (let i = 0; i < soldOut; i++) await expect(rows.nth(i)).toContainText('Sold out');

  // sort by stock, highest first (two clicks on the header)
  await page.goto('/admin/products?sort=stock&order=desc');
  await expect(page.getByRole('link', { name: /Sort by Stock, now descending/ })).toBeVisible();

  // bulk: feature two products that are not featured yet
  await page.goto('/admin/products?sort=title&order=asc');
  const plain = rows.filter({ hasNotText: 'Featured' });
  const titles = await Promise.all([0, 1].map(async (i) => (await plain.nth(i).getByRole('link').first().textContent())!.trim()));
  const picked = titles.map((t) => rows.filter({ hasText: t }));
  for (const row of picked) await row.getByRole('checkbox').check();
  const bulk = page.getByRole('region', { name: 'Bulk actions' });
  await expect(bulk).toContainText('2 selected');
  await bulk.getByRole('button', { name: 'Feature', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('2 products updated');
  for (const row of picked) await expect(row).toContainText('Featured');
  const first = picked[0];
  const firstTitle = titles[0];

  // the page passes axe
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);

  // delete one product, find it in the trash, restore it
  page.once('dialog', (d) => d.accept());
  await first.getByRole('button', { name: 'Delete' }).click();
  await expect(rows.filter({ hasText: firstTitle })).toHaveCount(0);

  await page.getByRole('link', { name: 'Trash' }).click();
  await expect(page).toHaveURL(/admin\/products\/trash/);
  const trashed = page.getByRole('row').filter({ hasText: firstTitle });
  await trashed.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByRole('status')).toContainText(`${firstTitle} is back in the shop.`);
  await expect(trashed).toHaveCount(0);

  // undo the featured flag so other tests see the seeded home page
  await page.goto('/admin/products?sort=title&order=asc');
  for (const row of picked) await row.getByRole('checkbox').check();
  await page.getByRole('region', { name: 'Bulk actions' }).getByRole('button', { name: 'Unfeature' }).click();
  await expect(page.getByRole('status')).toContainText('2 products updated');
  for (const row of picked) await expect(row).not.toContainText('Featured');
});
