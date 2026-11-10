import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';
const ORIGIN = { Origin: 'http://localhost:3000' };

/** A customer with a paid order (through the Stripe simulator), made over the API. */
async function paidOrder(request: APIRequestContext) {
  const email = `ret_${Date.now()}@test.local`;
  const reg = await request.post(`${API}/auth/register`, { data: { name: 'Rita Return', email, password: 'Return-pass-1' } });
  const auth = { Authorization: `Bearer ${(await reg.json()).accessToken}` };
  const { data } = await (await request.get(`${API}/products?inStock=true&limit=1&category=drills`)).json();
  const sku = data[0].variants.find((v: { stock: number }) => v.stock > 0).sku;
  await request.post(`${API}/cart/items`, { headers: auth, data: { productId: data[0].id, sku, quantity: 1 } });
  const order = (await (await request.post(`${API}/cart/checkout`, { headers: auth, data: { shippingAddress: { fullName: 'Rita Return', line1: '1 Return Way', city: 'Berlin', postalCode: '10115', country: 'Germany' } } })).json()).data;
  const url = (await (await request.post(`${API}/orders/${order.id}/checkout`, { headers: auth })).json()).data.url as string;
  await request.post(`${API}/payments/simulator/sessions/${new URL(url).pathname.split('/').pop()}/pay`, { headers: { ...auth, ...ORIGIN }, data: { card: '4242424242424242' } });
  return { email, password: 'Return-pass-1', orderId: order.id as string };
}

async function signIn(browser: Browser, email: string, password: string, next: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`/account/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[/?]/g, '\\$&')));
  return page;
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations, page.url()).toEqual([]);
}

test('ship with tracking, print the label, return and refund', async ({ browser, request }) => {
  const { email, password, orderId } = await paidOrder(request);
  const admin = await signIn(browser, 'admin@shop-tools.local', 'Admin123!', `/admin/orders/${orderId}`);
  const status = admin.locator('#change-status');

  await status.getByLabel('Move to').selectOption('processing');
  await status.getByRole('button', { name: 'Update' }).click();
  await expect(status.getByRole('status')).toContainText('Processing');
  await status.getByLabel('Move to').selectOption('shipped');
  await status.getByRole('button', { name: 'Update' }).click();
  await expect(status.getByText('Enter the tracking number')).toBeVisible();
  await status.getByLabel('Carrier').selectOption('DHL');
  await status.getByLabel('Tracking number').fill('00340434161094042557');
  await status.getByRole('button', { name: 'Update' }).click();
  await expect(admin.locator('#main').getByRole('heading', { name: 'Shipment' })).toBeVisible();
  await axe(admin);

  await admin.locator('#main').getByRole('link', { name: 'Print shipping label' }).click();
  await expect(admin.locator('#main').getByRole('img', { name: /^Barcode TB-/ })).toBeVisible();
  await axe(admin);

  // the customer sees the tracking link and asks for a return
  const customer = await signIn(browser, email, password, `/account/orders/${orderId}`);
  const main = customer.locator('#main');
  await expect(main.getByTestId('tracking')).toContainText('DHL');
  await expect(main.getByRole('button', { name: 'Cancel order' })).toHaveCount(0);
  await main.getByRole('button', { name: 'Return items' }).click();
  await main.getByLabel('How many').selectOption('1');
  await main.getByLabel('Reason').selectOption('defective');
  await axe(customer);
  await main.getByRole('button', { name: 'Send request' }).click();
  await expect(main.getByTestId('return')).toContainText('Requested');

  // staff approve, receive and refund from the returns page
  await admin.goto('/admin/returns?status=requested');
  const row = admin.locator('#main').getByTestId('admin-return').filter({ hasText: orderId.slice(-6).toUpperCase() });
  await row.getByRole('button', { name: 'Approve' }).click();
  await admin.goto('/admin/returns?status=approved');
  await row.getByRole('button', { name: 'Mark received' }).click();
  await admin.goto('/admin/returns?status=received');
  admin.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: 'Refund' }).click();
  await admin.goto('/admin/returns?status=refunded');
  await expect(row).toContainText('Refunded');
  await axe(admin);

  await customer.reload();
  await expect(main.getByTestId('return')).toContainText('Refunded');
  await expect(main.getByTestId('return')).toContainText('sent');
});

test('a customer cancels a paid order before it ships and is refunded', async ({ browser, request }) => {
  const { email, password, orderId } = await paidOrder(request);
  const customer = await signIn(browser, email, password, `/account/orders/${orderId}`);
  customer.once('dialog', (d) => d.accept());
  await customer.locator('#main').getByRole('button', { name: 'Cancel order' }).click();
  await expect(customer.locator('#main').getByTestId('order-status')).toHaveText('Cancelled');
  await expect(customer.locator('#main').getByText('Your payment was refunded.')).toBeVisible();
});
