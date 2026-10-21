import type { Metadata } from 'next';
import Link from 'next/link';
import { Jost, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/widgets/header';
import { SiteFooter } from '@/widgets/footer';
import { SITE } from '@/shared/config';
import { Icon } from '@/shared/ui';
import { CartButton, CartDrawer, CartProvider } from '@/features/cart';

const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
});
const sans = Jost({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jost' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Leather Boots, Shoes & Bags`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <CartProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
          Skip to content
        </a>
        <SiteHeader
          account={
            <Link href="/account" aria-label="Account">
              <Icon name="user" width={21} height={21} />
            </Link>
          }
          cart={<CartButton />}
        />
        <main id="main">{children}</main>
        <SiteFooter />
        <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
