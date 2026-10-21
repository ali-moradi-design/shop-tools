import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatMoney } from '@/shared/lib/money';
import { formatQuantity } from '@/shared/lib/units';
import type { SpecDefinition } from '@/entities/category';
import { lowestPrice } from '../model/price';
import type { Product } from '../model/types';
import { StockLine } from './StockLine';

/**
 * Listing tile: product photo on white, SKU, name, four key specs, price, stock summary.
 * `specDefs` (from the category) gives each spec its units; `compare` is a slot for the compare toggle.
 */
export function ProductCard({
  product,
  specDefs,
  compare,
  priority,
  badge,
}: {
  product: Product;
  specDefs?: SpecDefinition[];
  compare?: ReactNode;
  priority?: boolean;
  badge?: string;
}) {
  const defsByKey = new Map((specDefs ?? []).map((d) => [d.key, d]));
  const shown = product.specs
    .filter((s) => !specDefs || defsByKey.get(s.key)?.filterable !== false)
    .slice(0, 4);
  const price = lowestPrice(product);
  const hasKitPrices = product.variants.some((v) => v.price !== undefined && v.price !== product.price);

  return (
    <article className="panel flex flex-col" data-testid="product-card">
      <Link href={`/products/${product.slug}`} className="block" aria-label={product.title}>
        <div className="relative h-[210px] border-b border-line-soft bg-white">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              priority={priority}
              className="object-contain p-2 mix-blend-multiply"
            />
          )}
          {badge && <span className="tag tag-accent absolute left-3 top-3">{badge}</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-3.5">
        <div className="font-mono text-[11px] text-mute">{product.model ?? product.slug}</div>
        <Link href={`/products/${product.slug}`} className="text-[15px] font-semibold leading-tight hover:underline">
          {product.title}
        </Link>
        {shown.length > 0 && (
          <dl className="border-t border-line-soft font-mono text-[12px]">
            {shown.map((s) => {
              const def = defsByKey.get(s.key);
              return (
                <div key={s.key} className="flex justify-between border-b border-line-soft py-1">
                  <dt>{s.label}</dt>
                  <dd className="font-semibold">
                    {s.kind === 'number' ? formatQuantity(Number(s.value), def?.units ?? [], 'metric', s.unit) : s.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
        <div className="mt-auto flex items-center">
          <div className="font-display text-[24px] font-bold leading-none" data-testid="card-price">
            {hasKitPrices && <span className="mr-1 font-mono text-[11px] font-normal text-mute">from</span>}
            {formatMoney(price, product.currency)}
            {product.compareAtPrice && (
              <s className="ml-1.5 font-mono text-[12px] font-normal text-mute">{formatMoney(product.compareAtPrice, product.currency)}</s>
            )}
          </div>
          <span className="flex-1" />
          {compare}
        </div>
        <StockLine product={product} className="text-[12px]" />
      </div>
    </article>
  );
}
