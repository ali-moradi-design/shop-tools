import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@/entities/category';
import type { ProductFacets } from '@/entities/product';
import { CATEGORY_IMAGES } from '@/shared/config';

export function SectionHead({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end">
      <h2 className="heading text-[34px] leading-none">{title}</h2>
      <span className="flex-1" />
      {href && <Link href={href} className="font-mono text-[12px] uppercase hover:underline">{linkLabel} →</Link>}
    </div>
  );
}

export function CategoryTiles({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link href={`/categories/${c.slug}`} className="panel block hover:border-ink" data-testid="category-tile">
            <div className="relative h-[150px] bg-white">
              {CATEGORY_IMAGES[c.slug] && <Image src={CATEGORY_IMAGES[c.slug]} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-contain p-3 mix-blend-multiply" />}
            </div>
            <div className="flex items-center border-t border-line-soft px-4 py-3">
              <h3 className="font-display text-[20px] font-bold uppercase leading-tight tracking-[0.02em]">{c.name}</h3>
              <span className="flex-1" />
              <span className="font-mono text-[12px] text-mute">{c.productCount}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const DISPATCH: Record<string, string> = { BER: 'Same-day dispatch', HAM: 'Next-day dispatch', MUC: 'Next-day dispatch' };

/** One block per warehouse with the number of products it has on the shelf right now. */
export function WarehouseBand({ warehouses }: { warehouses: ProductFacets['warehouses'] }) {
  return (
    <section aria-labelledby="stock-band" className="grid border-2 border-ink bg-ink text-white md:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <div className="px-7 py-7">
        <h2 id="stock-band" className="heading text-[34px] leading-[1.05] text-accent">Live stock<br />per warehouse</h2>
        <p className="mt-2 max-w-xs text-[#aeb4ba]">Every product page shows what each warehouse has right now, so you know where it ships from.</p>
      </div>
      {warehouses.map((w) => (
        <div key={w.code} className="border-t border-[#2a3037] px-7 py-7 md:border-l md:border-t-0">
          <div className="font-mono text-[12px] text-[#aeb4ba]">WAREHOUSE</div>
          <div className="font-display text-[40px] font-bold uppercase leading-none">{w.name}</div>
          <div className="mt-1.5 font-mono text-[26px] text-accent">{w.count}</div>
          <div className="text-[12px] text-[#aeb4ba]">products on the shelf · {DISPATCH[w.code] ?? 'Dispatch within 2 days'}</div>
        </div>
      ))}
    </section>
  );
}
