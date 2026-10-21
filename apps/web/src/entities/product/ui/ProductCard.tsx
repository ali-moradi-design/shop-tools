import Image from 'next/image';
import Link from 'next/link';
import { formatMoney } from '@/shared/lib/money';
import type { Product } from '../model/types';

/** Grid tile: light grey square image, name + price, color below (like the mockup). */
export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const soldOut = product.stock === 0;
  return (
    <Link href={`/products/${product.slug}`} className="group block" data-testid="product-card">
      <div className="relative aspect-square overflow-hidden bg-soft">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            priority={priority}
            className="object-contain transition-opacity duration-300 group-hover:opacity-0"
          />
        )}
        {product.images[1] && (
          <Image
            src={product.images[1]}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        {(soldOut || product.tags.includes('new-arrival')) && (
          <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em]">
            {soldOut ? 'Sold out' : 'New'}
          </span>
        )}
      </div>
      <div className="mt-3 flex justify-between gap-3 text-[15px]">
        <span>{product.name}</span>
        <span className="shrink-0">
          {product.compareAtPrice && (
            <s className="mr-2 text-mute">{formatMoney(product.compareAtPrice, product.currency)}</s>
          )}
          {formatMoney(product.price, product.currency)}
        </span>
      </div>
      <div className="text-[14px] text-mute">{product.color}</div>
    </Link>
  );
}
