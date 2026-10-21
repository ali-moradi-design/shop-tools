import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/entities/product';
import { cn } from '@/shared/lib/cn';

/** Color thumbnails grouped by collection; each color is its own product page. */
export function ColorPicker({ current, colors }: { current: Product; colors: Product[] }) {
  const groups = new Map<string, Product[]>();
  for (const p of colors) {
    const key = p.colorGroup ?? '';
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return (
    <div>
      <p className="mt-1.5 text-[14.5px]">Color: {current.color}</p>
      {[...groups.entries()].map(([group, items]) => (
        <div key={group}>
          {group && <p className="mb-1.5 mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-mute">{group}</p>}
          <div className="flex flex-wrap gap-1">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                aria-label={p.color}
                aria-current={p.id === current.id ? 'true' : undefined}
                title={p.color}
                className={cn(
                  'relative h-[67px] w-[67px] border bg-soft p-1',
                  p.id === current.id ? 'border-ink outline outline-1 outline-ink' : 'border-line hover:border-ink',
                )}
              >
                {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="67px" className="object-contain p-1" />}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
