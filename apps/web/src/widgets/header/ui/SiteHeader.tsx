import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Category } from '@/entities/category';
import { Icon, Logo } from '@/shared/ui';
import { CompareLink } from '@/features/compare';

/**
 * Header: utility bar, logo, search, account/compare/cart, category bar.
 * `cart` and `account` are slots for the per-visitor client parts.
 */
export function SiteHeader({ cart, account, categories }: { cart: ReactNode; account: ReactNode; categories: Category[] }) {
  return (
    <header className="sticky top-0 z-30 bg-white">
      {/* Bands span the full width; their content sits in the page container. */}
      <div className="bg-ink font-mono text-[11px] tracking-[0.06em] text-[#c9ced3]">
        <div className="container-page flex justify-between gap-6 py-1.5">
          <span>
            FREE SHIPPING OVER $150<span className="hidden sm:inline"> · SHIPS FROM <b className="font-medium text-accent">BERLIN</b> / <b className="font-medium text-accent">HAMBURG</b> / <b className="font-medium text-accent">MUNICH</b></span>
          </span>
          <span className="hidden lg:inline">DEMO SHOP — PAYMENTS ARE SIMULATED</span>
        </div>
      </div>
      <div className="border-b-2 border-ink">
        <div className="container-page flex flex-wrap items-center gap-x-5 gap-y-3 py-3 sm:h-[68px] sm:flex-nowrap sm:gap-x-7 sm:py-0">
          <Link href="/" aria-label="Toolbench home">
            <Logo />
          </Link>
          <form action="/search" role="search" className="order-last flex h-[42px] min-w-0 basis-full border-2 border-ink sm:order-none sm:flex-1 sm:basis-auto">
            <label htmlFor="site-search" className="sr-only">Search tools, SKUs or specs</label>
            <input
              id="site-search"
              name="q"
              placeholder="Search tools, SKUs or specs — e.g. “18V hammer drill”"
              className="min-w-0 flex-1 px-3.5 text-[14px] outline-none placeholder:text-mute"
            />
            <button type="submit" className="bg-ink px-5 font-mono text-[12px] tracking-[0.08em] text-white hover:text-accent">
              <span className="sr-only sm:not-sr-only">SEARCH</span>
              <Icon name="search" width={18} height={18} className="sm:hidden" />
            </button>
          </form>
          <div className="ml-auto flex items-center gap-4 text-[14px] font-medium sm:gap-5">
            {account}
            <CompareLink />
            {cart}
          </div>
        </div>
      </div>
      <nav aria-label="Categories" className="border-b border-line bg-white font-sans text-[13px] font-semibold uppercase tracking-[0.05em]">
        {/* Below xl: one scrolling row. From xl: a six-column grid, so every category is visible in tidy rows. */}
        <ul className="container-page no-scrollbar flex overflow-x-auto xl:grid xl:grid-cols-[repeat(6,auto)] xl:overflow-visible">
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0 border-line-soft xl:[&:nth-child(-n+6)]:border-b">
              <Link
                href={`/categories/${c.slug}`}
                className="-ml-px block whitespace-nowrap border-x border-line-soft px-[18px] py-3 text-center hover:bg-ink hover:text-accent xl:px-3.5 xl:py-2.5"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
