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
      <div className="flex justify-between bg-ink px-4 py-1.5 font-mono text-[11px] tracking-[0.06em] text-[#c9ced3] sm:px-8">
        <span>
          FREE SHIPPING OVER $150 · SHIPS FROM <b className="font-medium text-accent">BERLIN</b> / <b className="font-medium text-accent">HAMBURG</b> / <b className="font-medium text-accent">MUNICH</b>
        </span>
        <span className="hidden sm:inline">DEMO SHOP — PAYMENTS ARE SIMULATED</span>
      </div>
      <div className="flex h-[68px] items-center gap-5 border-b-2 border-ink px-4 sm:gap-7 sm:px-8">
        <Link href="/" aria-label="Toolbench home">
          <Logo />
        </Link>
        <form action="/search" role="search" className="flex h-[42px] min-w-0 flex-1 border-2 border-ink">
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
        <div className="flex items-center gap-5 text-[14px] font-medium">
          {account}
          <CompareLink />
          {cart}
        </div>
      </div>
      <nav aria-label="Categories" className="no-scrollbar flex overflow-x-auto border-b border-line bg-white font-sans text-[13px] font-semibold uppercase tracking-[0.05em]">
        {categories.map((c) => (
          <Link key={c.slug} href={`/categories/${c.slug}`} className="shrink-0 border-r border-line-soft px-[18px] py-3 first:border-l hover:bg-ink hover:text-accent">
            {c.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
