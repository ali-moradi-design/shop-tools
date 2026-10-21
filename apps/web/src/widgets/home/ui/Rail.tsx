import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function SectionHead({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between px-4 pb-4 pt-16 sm:px-[25px] sm:pt-[72px]">
      <h2 className="heading text-[24px] sm:text-[28px]">{title}</h2>
      {href && (
        <Link href={href} className="text-[11px] font-medium uppercase tracking-[0.14em] underline underline-offset-4">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/** Horizontally scrolling row of lifestyle category tiles. */
export function CategoryRail({ items }: { items: { image: string; label: string; href: string }[] }) {
  return (
    <div className="no-scrollbar flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 sm:scroll-px-[25px] sm:px-[25px]">
      {items.map((it) => (
        <Link key={it.label} href={it.href} className="w-[60vw] shrink-0 snap-start text-center sm:w-[245px]">
          <div className="relative h-[290px]">
            <Image src={it.image} alt="" fill sizes="245px" className="object-cover" />
          </div>
          <span className="mt-4 block text-[11px] font-medium uppercase tracking-[0.16em]">{it.label}</span>
        </Link>
      ))}
    </div>
  );
}

export function ProductRail({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 sm:scroll-px-[25px] sm:px-[25px] [&>*]:w-[70vw] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-[300px]">
      {children}
    </div>
  );
}
