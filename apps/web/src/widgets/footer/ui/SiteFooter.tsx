import Link from 'next/link';
import type { Category } from '@/entities/category';
import { SITE } from '@/shared/config';

export function SiteFooter({ categories }: { categories: Category[] }) {
  return (
    <footer className="mt-16 bg-ink text-[13px] text-[#aeb4ba]">
      <div className="container-page grid gap-8 py-9 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <h2 className="mb-2 font-display text-[15px] font-bold uppercase tracking-[0.1em] text-white">{SITE.name}</h2>
          <p className="max-w-md">
            A demo shop for a portfolio. Product photos belong to their owners and are used only as sample content;
            prices and stock are generated and the payment gateway is simulated.
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-display text-[15px] font-bold uppercase tracking-[0.1em] text-white">Shop</h2>
          <ul className="space-y-1">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}><Link href={`/categories/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-display text-[15px] font-bold uppercase tracking-[0.1em] text-white">Help</h2>
          <ul className="space-y-1">
            <li><Link href="/help" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/help#shipping" className="hover:text-white">Shipping & returns</Link></li>
            <li><Link href="/help#specs" className="hover:text-white">Spec guide</Link></li>
            <li><Link href="/account" className="hover:text-white">My account</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-display text-[15px] font-bold uppercase tracking-[0.1em] text-white">Warehouses</h2>
          <p>Berlin · Hamburg · Munich</p>
          <p className="mt-3">© 2026 {SITE.legalName}</p>
        </div>
      </div>
    </footer>
  );
}
