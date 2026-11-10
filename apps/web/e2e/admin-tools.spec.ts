import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations, page.url()).toEqual([]);
}

test('roles, activity, CSV import and insights', async ({ page }) => {
  await page.goto('/account/login?next=/admin/roles');
  await page.getByLabel('Email', { exact: true }).fill('admin@shop-tools.local');
  await page.getByLabel('Password').fill('Admin123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/admin\/roles/);
  const main = page.locator('#main');

  // a new role with one permission
  const name = `support${Date.now().toString(36)}`;
  await main.getByRole('button', { name: 'New role' }).click();
  await main.getByLabel('Name').fill(name);
  await main.getByRole('checkbox').first().check();
  await main.getByRole('button', { name: 'Create role' }).click();
  await expect(main.getByTestId('admin-role').filter({ hasText: name })).toContainText('1 permissions');
  await axe(page);

  // the change shows in the activity log
  await page.goto('/admin/activity');
  await expect(main.getByTestId('admin-audit').first()).toContainText(`Created role ${name}`);
  await axe(page);

  // import: the exported catalog checks clean (dry run)
  const csv = await (await page.request.get('/api/v1/admin/export/products.csv')).text();
  expect(csv.split('\n')[0]).toContain('options');
  await page.goto('/admin/products/import');
  await main.getByLabel('CSV file').setInputFiles({ name: 'products.csv', mimeType: 'text/csv', buffer: Buffer.from(csv.split('\r\n').slice(0, 6).join('\r\n')) });
  await main.getByRole('button', { name: 'Check file' }).click();
  await expect(main.getByRole('status')).toContainText('5 existing products would be saved');
  await axe(page);

  // insights on the dashboard
  await page.goto('/admin');
  await expect(main.getByTestId('kpi-Returning customers')).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Sales by category, 30 days' })).toBeVisible();
});
