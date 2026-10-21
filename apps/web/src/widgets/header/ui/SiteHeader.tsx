import Link from 'next/link';
import type { ReactNode } from 'react';
import { COLLECTIONS, MAIN_NAV, SUB_NAV } from '@/shared/config';
import { Icon, Logo } from '@/shared/ui';

const titleOf = (slug: string) => COLLECTIONS.find((c) => c.slug === slug)?.title ?? slug;

/**
 * Static header (part of the PPR shell). `cart` and `account` are slots for the
 * dynamic, per-visitor parts.
 */
export function SiteHeader({ cart, account }: { cart: ReactNode; account: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="h-[33px] bg-ink text-center text-[11px] font-medium leading-[33px] tracking-[0.14em] text-white">
        FREE SHIPPING AND RETURNS ON EVERY ORDER
        <Link href="/help" className="ml-2 underline underline-offset-[3px]">
          DETAILS
        </Link>
      </div>
      <div className="grid h-[78px] grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4 sm:px-[30px]">
        <nav aria-label="Main" className="flex items-center gap-6 text-[13px] font-medium tracking-[0.1em]">
          <details className="group relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center" aria-label="Menu">
              <Icon name="menu" />
            </summary>
            <div className="absolute left-0 top-10 z-50 w-64 border border-line bg-white p-4 shadow-sm">
              {COLLECTIONS.map((c) => (
                <Link key={c.slug} href={`/collections/${c.slug}`} className="block py-1.5 text-sm tracking-normal">
                  {c.title}
                </Link>
              ))}
              <Link href="/about" className="block py-1.5 text-sm tracking-normal">About</Link>
            </div>
          </details>
          {MAIN_NAV.map((menu) => (
            <div key={menu.label} className="group relative hidden lg:block">
              <button type="button" className="flex items-center gap-1 py-6 uppercase" aria-haspopup="true">
                {menu.label}
                <Icon name="chevron" width={12} height={12} />
              </button>
              <div className="invisible absolute left-0 top-full z-50 w-56 border border-line bg-white p-4 opacity-0 shadow-sm transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                {menu.links.map((slug) => (
                  <Link key={slug} href={`/collections/${slug}`} className="block py-1.5 text-sm font-normal tracking-normal hover:underline">
                    {titleOf(slug)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link href="/about" className="hidden uppercase lg:block">
            About
          </Link>
        </nav>
        <Link href="/" aria-label="Welt & Grain home">
          <Logo />
        </Link>
        <div className="flex items-center justify-end gap-5 text-[13px] font-medium tracking-[0.1em]">
          <Link href="/help" className="hidden uppercase lg:block">
            Help
          </Link>
          {account}
          <Link href="/search" aria-label="Search">
            <Icon name="search" width={21} height={21} />
          </Link>
          {cart}
        </div>
      </div>
      <nav aria-label="Categories" className="hidden h-12 items-center justify-center gap-8 border-b border-line bg-soft text-[13.5px] lg:flex">
        {SUB_NAV.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="hover:underline">
            {c.title}
          </Link>
        ))}
      </nav>
    </header>
  );
}
