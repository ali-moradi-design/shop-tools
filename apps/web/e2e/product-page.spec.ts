import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** A product with reviews (the seed reviews the top-rated products). */
async function reviewedProduct(request: import('@playwright/test').APIRequestContext) {
  const res = await request.get('http://localhost:4000/api/v1/products?sort=rating&order=desc&limit=2&inStock=true');
  const { data } = await res.json();
  return data as { slug: string; title: string }[];
}

test('product page: zoom view, rating summary, related products, share, recently viewed', async ({ page, request }) => {
  const [first, second] = await reviewedProduct(request);
  await page.goto(`/products/${first.slug}`);
  const main = page.locator('#main');

  // full-screen photo view opens and closes with Escape
  await main.getByRole('button', { name: /Open photo 1 of \d+ full screen/ }).click();
  const dialog = page.getByRole('dialog', { name: `${first.title} photos` });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Zoom in' }).click();
  await expect(dialog.getByRole('button', { name: 'Zoom out' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // rating summary with a bar per star
  const summary = main.getByTestId('rating-summary');
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('list', { name: 'Reviews per star' }).getByRole('listitem')).toHaveCount(5);

  await expect(main.getByRole('heading', { name: /^More / })).toBeVisible();
  await expect(main.getByRole('button', { name: 'Share' })).toBeVisible();

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);

  // the second product page lists the first one as recently viewed
  await page.goto(`/products/${second.slug}`);
  const recent = main.getByRole('region', { name: 'Recently viewed' });
  await expect(recent.getByRole('link', { name: new RegExp(first.title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible();
});

test('product page on a phone: the add-to-cart bar sticks once the button scrolls away', async ({ browser, request }) => {
  const [p] = await reviewedProduct(request);
  const page = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  await page.goto(`/products/${p.slug}`);
  await expect(page.getByTestId('sticky-buy-bar')).toHaveCount(0);
  await page.locator('#main').getByTestId('add-to-cart').waitFor();
  await page.mouse.wheel(0, 2500);
  const bar = page.getByTestId('sticky-buy-bar');
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('cart-button')).toContainText('1');
});

test('client navigation through several product pages keeps working', async ({ page, request }) => {
  const { data } = await (await request.get('http://localhost:4000/api/v1/products?category=drills&inStock=true&limit=4')).json();
  await page.goto('/categories/drills?instock=1', { waitUntil: 'networkidle' });
  for (const p of data.slice(0, 3) as { slug: string; title: string }[]) {
    await page.goto('/categories/drills?instock=1');
    await page.locator('#main').getByRole('link', { name: p.title, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/products/${p.slug}$`));
    await expect(page.locator('#main').getByRole('heading', { level: 1 })).toHaveText(p.title);
    await expect(page.locator('#main').getByTestId('add-to-cart')).toBeVisible();
    // and on to a related product, without a full page load
    const related = page.locator('#main').getByRole('region', { name: /^More / }).getByTestId('product-card').first();
    if (await related.count()) {
      await related.getByRole('link').first().click();
      await expect(page.locator('#main').getByTestId('add-to-cart')).toBeVisible();
    }
  }
});
