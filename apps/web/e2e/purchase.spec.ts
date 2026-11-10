import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const DEMO = { email: 'demo@shop-tools.local', password: 'Demo123!' };
const ADMIN = { email: 'admin@shop-tools.local', password: 'Admin123!' };

test('browse → cart → simulated Stripe Checkout → order shows its warehouse → order visible in admin', async ({ browser }) => {
  const shopper = await (await browser.newContext()).newPage();

  // browse a category, keep only what is in stock, open the first product
  await shopper.goto('/categories/drills?instock=1');
  await expect(shopper.getByTestId('product-card').first()).toBeVisible();
  await shopper.getByTestId('product-card').first().getByRole('link').first().click();

  // the product page lists the stock of every warehouse
  await expect(shopper.getByTestId('warehouse-stock')).toBeVisible();
  await expect(shopper.locator('[data-warehouse]')).toHaveCount(3);
  await shopper.getByTestId('add-to-cart').click();
  const drawer = shopper.getByTestId('cart-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId('cart-line')).toHaveCount(1);
  const title = (await drawer.getByTestId('cart-line').getByRole('link').first().innerText()).trim();

  // checkout needs an account: sign in with the demo customer, cart follows
  await drawer.getByRole('link', { name: 'Checkout' }).click();
  await expect(shopper).toHaveURL(/account\/login/);
  await shopper.getByLabel('Email', { exact: true }).fill(DEMO.email);
  await shopper.getByLabel('Password').fill(DEMO.password);
  await shopper.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(shopper).toHaveURL(/\/checkout/);
  await expect(shopper.getByText(title).first()).toBeVisible();

  await shopper.getByLabel('Address', { exact: true }).fill('1 Workshop Road');
  await shopper.getByLabel('City').fill('Berlin');
  await shopper.getByLabel('Postal code').fill('10115');
  await shopper.getByRole('button', { name: 'Continue to payment' }).click();

  // the Stripe Checkout simulator: decline first, then pay; the signed webhook confirms the order
  await expect(shopper).toHaveURL(/\/pay\/cs_test_mock_/);
  const main = shopper.locator('#main');
  await expect(main.getByText('Test mode', { exact: true })).toBeVisible();
  const axe = await new AxeBuilder({ page: shopper }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
  await main.getByLabel('Card number').fill('4000 0000 0000 0002');
  await main.getByRole('button', { name: /^Pay \$/ }).click();
  await expect(main.getByText('Your card was declined')).toBeVisible();
  await main.getByLabel('Card number').fill('4242 4242 4242 4242');
  await main.getByRole('button', { name: /^Pay \$/ }).click();
  await expect(shopper).toHaveURL(/checkout=success/);
  // a full page load: React holds streamed parts in a hidden copy for a moment, so look inside <main>
  await expect(main.getByRole('status').filter({ hasText: 'Your payment went through' })).toBeVisible();
  await expect(main.getByTestId('order-status')).toHaveText(/paid/i);
  // the paid order remembers which warehouse the units came from
  await expect(main.getByTestId('order-allocations').first()).toContainText(/Shipped from/);
  const orderNo = (await main.getByRole('heading', { level: 1 }).innerText()).replace(/^order\s*/i, '');

  // the admin sees the order
  const admin = await (await browser.newContext()).newPage();
  await admin.goto('/account/login?next=/admin/orders');
  await admin.getByLabel('Email', { exact: true }).fill(ADMIN.email);
  await admin.getByLabel('Password').fill(ADMIN.password);
  await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(admin).toHaveURL(/admin\/orders/);
  await expect(admin.getByTestId('admin-order').filter({ hasText: orderNo })).toContainText('Paid');
});
