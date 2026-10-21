'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COMPARE_MAX, useCompare } from '../model/CompareProvider';

/** Fixed bar at the bottom: the products picked so far and the way to the compare page. */
export function CompareTray() {
  const { items, message, remove, clear, href } = useCompare();
  const pathname = usePathname();
  if (items.length === 0 || pathname === '/compare') return null;
  const ready = items.length >= 2;

  return (
    <aside
      aria-label="Compare tray"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-accent bg-ink text-white"
      data-testid="compare-tray"
    >
      <div className="container-page flex flex-wrap items-center gap-4 py-3">
        <b className="font-display text-[22px] uppercase tracking-[0.08em]">
          Compare <span className="font-mono text-accent">{items.length} / {COMPARE_MAX}</span>
        </b>
        <ul className="flex items-center gap-2.5">
          {items.map((i) => (
            <li key={i.slug} className="relative h-[60px] w-[60px] border border-[#444] bg-white">
              {i.image && <Image src={i.image} alt={i.title} fill sizes="60px" className="object-contain p-1" />}
              <button
                type="button"
                aria-label={`Remove ${i.title} from compare`}
                onClick={() => remove(i.slug)}
                className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center border border-ink bg-accent text-[11px] font-bold text-accent-ink"
              >
                ✕
              </button>
            </li>
          ))}
          {items.length < COMPARE_MAX && (
            <li aria-hidden className="grid h-[60px] w-[60px] place-items-center border border-dashed border-[#666] text-[22px] text-[#777]">+</li>
          )}
        </ul>
        <span className="flex-1" />
        <span className="font-mono text-[12px] text-[#aeb4ba]" role="status">
          {message ?? (ready ? 'Same category only' : 'Pick at least two')}
        </span>
        <button type="button" onClick={clear} className="font-mono text-[12px] underline">Clear</button>
        {ready ? (
          <Link href={href} className="btn" data-testid="compare-now">Compare now →</Link>
        ) : (
          <span className="btn pointer-events-none opacity-40" aria-disabled>Compare now →</span>
        )}
      </div>
    </aside>
  );
}
