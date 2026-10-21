import type { Metadata } from 'next';
import Link from 'next/link';
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/widgets/header';
import { SiteFooter } from '@/widgets/footer';
import { fetchCategories } from '@/entities/category';
import { SITE } from '@/shared/config';
import { Icon } from '@/shared/ui';
import { CartButton, CartDrawer, CartProvider } from '@/features/cart';
import { CompareProvider, CompareTray } from '@/features/compare';

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow',
});
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-sans' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono' });

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
