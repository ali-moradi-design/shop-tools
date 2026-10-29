import type { Metadata } from 'next';
import Link from 'next/link';
import localFont from 'next/font/local';
import './globals.css';
import { SiteHeader } from '@/widgets/header';
import { SiteFooter } from '@/widgets/footer';
import { fetchCategories } from '@/entities/category';
import { SITE } from '@/shared/config';
import { Icon } from '@/shared/ui';
import { CartButton, CartDrawer, CartProvider } from '@/features/cart';
import { CompareProvider, CompareTray } from '@/features/compare';

// Fonts are stored in the repo (./fonts, Latin subset from Fontsource, SIL OFL), so the
// build never downloads them and the site makes no request to Google Fonts.
const display = localFont({
  src: [
    { path: './fonts/barlow-condensed-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/barlow-condensed-latin-600-normal.woff2', weight: '600' },
    { path: './fonts/barlow-condensed-latin-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-barlow',
});
const sans = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/ibm-plex-sans-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/ibm-plex-sans-latin-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-plex-sans',
});
const mono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/ibm-plex-mono-latin-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Tools with the specs that matter`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, type: 'website' },
};

/**
 * Server-side rendering for every page: prices and stock are always current, and each
 * response can carry its own CSP nonce (see src/proxy.ts). A static page could not.
 */
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await fetchCategories().catch(() => []);
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <CartProvider>
          <CompareProvider>
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-accent focus:p-2">
              Skip to content
            </a>
            <SiteHeader
              categories={categories}
              account={
                <Link href="/account" aria-label="Account" className="flex items-center gap-1.5">
                  <Icon name="user" width={20} height={20} />
                  <span className="hidden sm:inline">Account</span>
                </Link>
              }
              cart={<CartButton />}
            />
            <main id="main">{children}</main>
            <SiteFooter categories={categories} />
            <CartDrawer />
            <CompareTray />
          </CompareProvider>
        </CartProvider>
      </body>
    </html>
  );
}
