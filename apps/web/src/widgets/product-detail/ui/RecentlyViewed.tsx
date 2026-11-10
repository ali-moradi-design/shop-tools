'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';
import { formatMoney } from '@/shared/lib/money';

export interface ViewedProduct {
  slug: string;
  title: string;
  image?: string;
  price: number;
}

const KEY = 'tb:recently-viewed';
const MAX = 8;
const listeners = new Set<() => void>();
let cache: { raw: string | null; list: ViewedProduct[] } = { raw: null, list: [] };

/** Parsed once per change: useSyncExternalStore needs the same array back each call. */
function read(): ViewedProduct[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // private mode or blocked storage: nothing to show
  }
  if (raw !== cache.raw) {
    let list: ViewedProduct[] = [];
    try {
      list = raw ? (JSON.parse(raw) as ViewedProduct[]) : [];
    } catch {
      list = [];
    }
    cache = { raw, list: Array.isArray(list) ? list : [] };
  }
  return cache.list;
}

function remember(p: ViewedProduct) {
  const next = [p, ...read().filter((x) => x.slug !== p.slug)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const NONE: ViewedProduct[] = [];

/**
 * Products this visitor looked at before, kept in their browser only. Renders
 * nothing on the server and on the first visit, so it never causes a hydration
 * mismatch; it records the current product after showing the others.
 */
export function RecentlyViewed({ current }: { current: ViewedProduct }) {
  const list = useSyncExternalStore(subscribe, read, () => NONE);
  const others = list.filter((p) => p.slug !== current.slug);

  useEffect(() => {
    remember(current);
  }, [current]);

  if (others.length === 0) return null;
  return (
    <section className="mt-12" aria-labelledby="recently-viewed">
      <h2 id="recently-viewed" className="heading mb-4 text-[28px]">Recently viewed</h2>
      <ul className="no-scrollbar flex gap-3 overflow-x-auto">
        {others.map((p) => (
          <li key={p.slug} className="w-[150px] shrink-0 sm:w-[180px]">
            <Link href={`/products/${p.slug}`} className="group block">
              <span className="panel relative block aspect-square">
                {p.image && <Image src={p.image} alt="" fill sizes="180px" className="object-contain p-2 mix-blend-multiply" />}
              </span>
              <span className="mt-2 block truncate text-[14px] text-ink group-hover:underline">{p.title}</span>
              <span className="block font-mono text-[12px] text-steel">{formatMoney(p.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
