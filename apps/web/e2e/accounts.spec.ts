import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

/** The last email to an address, read from the admin outbox (no SMTP in the test run). */
async function lastEmail(request: APIRequestContext, to: string, template: string) {
  const login = await request.post(`${API}/auth/login`, { data: { email: 'admin@shop-tools.local', password: 'Admin123!' } });
  const { accessToken } = await login.json();
  for (let i = 0; i < 10; i++) {
    const res = await request.get(`${API}/emails?to=${encodeURIComponent(to)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const mail = ((await res.json()).data as { template: string; text: string }[]).find((m) => m.template === template);
    if (mail) return mail;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`no ${template} email to ${to}`);
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations, page.url()).toEqual([]);
}

test('guest checkout: no account needed, then set a password from the emailed link', async ({ browser, request }) => {
  const page = await (await browser.newContext()).newPage();
  const email = `guest_${Date.now()}@test.local`;
  await page.goto('/categories/drills?instock=1');
  await page.getByTestId('product-card').first().getByRole('link').first().click();
  await page.locator('#main').getByTestId('add-to-cart').click();
  await page.getByTestId('cart-drawer').getByRole('link', { name: 'Checkout' }).click();
  await expect(page).toHaveURL(/account\/login\?next=%2Fcheckout|account\/login\?next=\/checkout/);

  const guest = page.getByRole('region', { name: 'New customer?' });
  await guest.getByLabel('Name').fill('Gita Guest');
  await guest.getByLabel('Email for your receipt').fill(email);
  await guest.getByRole('button', { name: 'Continue as guest' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('#main').getByLabel('Full name')).toHaveValue('Gita Guest');

  // the guest-welcome email carries a set-password link
  const mail = await lastEmail(request, email, 'guest-welcome');
  const link = /(\/account\/reset-password\?token=[a-f0-9]+)/.exec(mail.text)![1];
  await page.goto(link);
  await page.locator('#main').getByLabel('New password').fill('Guest-pass-123');
  await page.locator('#main').getByLabel('Repeat it').fill('Guest-pass-123');
  await page.locator('#main').getByRole('button', { name: 'Save password' }).click();
  await expect(page.locator('#main').getByRole('status')).toContainText('Your password is set');
});

test('forgot password, account settings with an address, saved address at checkout', async ({ browser, request }) => {
  const page = await (await browser.newContext()).newPage();
  const email = `set_${Date.now()}@test.local`;
  await request.post(`${API}/auth/register`, { data: { name: 'Sam Settings', email, password: 'First-pass-123' } });

  // wait until React has taken over, or the form would submit the plain HTML way
  await page.goto('/account/login', { waitUntil: 'networkidle' });
  await page.locator('#main').getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(page).toHaveURL(/forgot-password/);
  await page.locator('#main').getByLabel('Email').fill(email);
  await page.locator('#main').getByRole('button', { name: 'Email me a link' }).click();
  await expect(page.locator('#main').getByRole('status')).toContainText('on its way');
  await axe(page);
  const mail = await lastEmail(request, email, 'password-reset');
  await page.goto(/(\/account\/reset-password\?token=[a-f0-9]+)/.exec(mail.text)![1]);
  await page.locator('#main').getByLabel('New password').fill('Second-pass-123');
  await page.locator('#main').getByLabel('Repeat it').fill('Second-pass-123');
  await page.locator('#main').getByRole('button', { name: 'Save password' }).click();
  await page.locator('#main').getByRole('link', { name: 'Sign in' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password').fill('Second-pass-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.locator('#main').getByRole('link', { name: 'Settings' }).click();
  const main = page.locator('#main');
  await expect(main.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await axe(page);
  await main.getByRole('button', { name: /Add an address|Add address/ }).click();
  await main.getByLabel('Full name').fill('Sam Settings');
  await main.getByLabel('Address', { exact: true }).fill('7 Bench Street');
  await main.getByLabel('City').fill('Hamburg');
  await main.getByLabel('Postal code').fill('20095');
  await main.getByLabel('Country').fill('Germany');
  await main.getByRole('button', { name: /Save address/ }).click();
  await expect(main.getByTestId('saved-address')).toContainText('7 Bench Street');

  // checkout fills the form from the saved default address
  await page.goto('/categories/drills?instock=1');
  await page.getByTestId('product-card').first().getByRole('link').first().click();
  await page.locator('#main').getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  await page.goto('/checkout');
  await expect(page.locator('#main').getByLabel('City')).toHaveValue('Hamburg');
  await expect(page.locator('#main').getByText('Filled in from your saved address')).toBeVisible();
});

test('newsletter: sign up in the footer, unsubscribe with the emailed link', async ({ page, request }) => {
  const email = `news_${Date.now()}@test.local`;
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await footer.getByLabel(/New tools, restocks and deals/).fill(email);
  await footer.getByRole('button', { name: 'Subscribe' }).click();
  await expect(footer.getByRole('status')).toContainText('on the list');

  const mail = await lastEmail(request, email, 'newsletter-welcome');
  await page.goto(/(\/newsletter\/unsubscribe\?token=[a-f0-9]+)/.exec(mail.text)![1]);
  await axe(page);
  await page.locator('#main').getByRole('button', { name: 'Unsubscribe' }).click();
  await expect(page.locator('#main').getByRole('status')).toContainText('You are unsubscribed');
});

test('admin emails page lists the outbox and passes axe', async ({ page }) => {
  await page.goto('/account/login?next=/admin/emails');
  await page.getByLabel('Email', { exact: true }).fill('admin@shop-tools.local');
  await page.getByLabel('Password').fill('Admin123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/admin\/emails/);
  const first = page.locator('#main').getByTestId('admin-email').first();
  await expect(first).toBeVisible();
  await first.getByRole('button').first().click();
  await expect(first.getByRole('button').first()).toHaveAttribute('aria-expanded', 'true');
  await axe(page);
});
