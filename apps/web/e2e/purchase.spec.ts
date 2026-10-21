import { expect, test } from '@playwright/test';

const DEMO = { email: 'demo@shop-tools.local', password: 'Demo123!' };
const ADMIN = { email: 'admin@shop-tools.local', password: 'Admin123!' };

test('browse → cart → fake payment → order visible in admin', async ({ browser }) => {
  const shopper = await browser.newPage();

  // browse a collection and filter by size
  await shopper.goto('/collections/mens-boots');
  await shopper.locator('summary:visible', { hasText: /^Size/ }).click();
  await shopper.locator('details[open]').getByRole('button', { name: '10', exact: true }).click();
  await expect(shopper).toHaveURL(/size=10/);
  await shopper.getByTestId('product-card').first().click();

  // pick a size and add to cart
  // the listing is cached for a while, so take any size that is in stock right now
  await shopper.locator('[role=radio]:not([disabled])').first().click();
  await shopper.getByTestId('add-to-cart').click();
  const drawer = shopper.getByTestId('cart-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId('cart-line')).toHaveCount(1);
  const title = (await drawer.getByTestId('cart-line').getByRole('link').innerText()).trim();

  // checkout needs an account: sign in with the demo customer, cart follows
  await drawer.getByRole('link', { name: 'Checkout' }).click();
  await expect(shopper).toHaveURL(/account\/login/);
  await shopper.getByLabel('Email', { exact: true }).fill(DEMO.email);
  await shopper.getByLabel('Password').fill(DEMO.password);
  await shopper.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(shopper).toHaveURL(/\/checkout/);
  await expect(shopper.getByText(title)).toBeVisible();

  await shopper.getByLabel('Address', { exact: true }).fill('1 Leather Lane');
  await shopper.getByLabel('City').fill('Berlin');
  await shopper.getByLabel('Postal code').fill('10115');
  await shopper.getByRole('button', { name: 'Continue to payment' }).click();

  // simulated gateway: decline first, then approve
  await expect(shopper).toHaveURL(/\/pay\//);
  await shopper.getByLabel('Card number').fill('4000 0000 0000 0002');
  await shopper.getByRole('button', { name: /^Pay \$/ }).click();
  await expect(shopper.getByText('Your card was declined')).toBeVisible();
  await shopper.getByLabel('Card number').fill('4242 4242 4242 4242');
  await shopper.getByRole('button', { name: /^Pay \$/ }).click();
  await expect(shopper).toHaveURL(/paid=1/);
  await expect(shopper.getByTestId('order-status')).toHaveText(/paid/i);
  const orderNo = (await shopper.getByRole('heading', { level: 1 }).innerText()).replace('Order ', '');

  // the admin sees the order
  const admin = await (await browser.newContext()).newPage();
  await admin.goto('/account/login?next=/admin/orders');
  await admin.getByLabel('Email', { exact: true }).fill(ADMIN.email);
  await admin.getByLabel('Password').fill(ADMIN.password);
  await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(admin).toHaveURL(/admin\/orders/);
  await expect(admin.getByTestId('admin-order').filter({ hasText: orderNo })).toContainText('Paid');
});
