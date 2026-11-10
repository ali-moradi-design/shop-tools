import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fetchCategory, fetchWarehouses } from '@/entities/category';
import { fetchLiveVariants, fetchProduct, lowestPrice, SpecTable, type Product } from '@/entities/product';
import { BuyBox, BuyBoxSkeleton } from '@/features/add-to-cart';
import { CompareToggle } from '@/features/compare';
import { FavoriteButton } from '@/features/favorite';
import { ReviewForm, ReviewList } from '@/features/reviews';
import { Details, Gallery, RecentlyViewed, RelatedProducts, ShareButton } from '@/widgets/product-detail';
import { getVariant } from '@/shared/lib/ab/server';
import { formatMoney } from '@/shared/lib/money';
import { Stars } from '@/shared/ui';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.title,
    description: `${product.title} — ${product.features.slice(0, 2).join(', ')}. ${formatMoney(product.price)}, stock per warehouse.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { images: product.images.slice(0, 1), type: 'website' },
  };
}

/** Live stock per variant and warehouse, streamed so the rest of the page is not held back. */
async function LiveBuyBox({ product }: { product: Product }) {
  // the variant cookie is read here, in the part that is per visitor anyway
  const [variants, warehouses, cta] = await Promise.all([fetchLiveVariants(product.slug), fetchWarehouses(), getVariant('pdp-cta')]);
  return <BuyBox productId={product.id} title={product.title} price={product.price} variants={variants} warehouses={warehouses} ctaVariant={cta} />;
}

export default async function ProductPage({ params }: Props) {
  const product = await fetchProduct((await params).slug);
  if (!product) notFound();
  const category = await fetchCategory(product.category);
  const unitsByKey = Object.fromEntries((category?.specs ?? []).map((s) => [s.key, s.units]));
  const keySpecs = product.specs.slice(0, 5);
  const percentOff = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;

  return (
    <div className="container-page pb-28">
      <nav aria-label="Breadcrumb" className="py-4 font-mono text-[12px] text-mute">
        <Link href="/" className="hover:text-ink">Home</Link> /{' '}
        <Link href={`/categories/${product.category}`} className="hover:text-ink">{product.categoryName}</Link> /{' '}
        <span className="text-ink" aria-current="page">{product.model ?? product.slug}</span>
      </nav>
      <section className="grid gap-9 lg:grid-cols-[1.1fr_1fr]">
        <Gallery images={product.images} title={product.title} badge={percentOff > 0 ? `−${percentOff}%` : undefined} />
        <div className="space-y-4">
          <p className="font-mono text-[12px] text-mute">SKU {product.model ?? product.slug}{product.brand ? ` · BRAND: ${product.brand.toUpperCase()}` : ''}</p>
          <div className="flex items-start justify-between gap-4">
            <h1 className="heading text-[38px] leading-[1.02] sm:text-[48px]">{product.title}</h1>
            <FavoriteButton productId={product.id} />
          </div>
          {product.ratingCount > 0 && (
            <a href="#reviews" className="flex items-center gap-2 text-[14px]">
              <Stars value={product.ratingAvg} />
              <span className="font-mono text-[12px] underline">{product.ratingAvg.toFixed(1)} · {product.ratingCount} reviews</span>
            </a>
          )}
          <p className="flex items-baseline gap-3">
            <span className="font-display text-[44px] font-bold leading-none" data-testid="product-price">{formatMoney(product.price, product.currency)}</span>
            {product.compareAtPrice && (
              <>
                <s className="font-mono text-mute">{formatMoney(product.compareAtPrice, product.currency)}</s>
                <span className="tag tag-accent">Save {formatMoney(product.compareAtPrice - product.price, product.currency)} ({percentOff}%)</span>
              </>
            )}
          </p>
          {keySpecs.length > 0 && (
            <dl className="border-t-2 border-ink font-mono text-[12px]">
              {keySpecs.map((s) => (
                <div key={s.key} className="flex justify-between border-b border-line-soft py-1.5">
                  <dt>{s.label}</dt>
                  <dd className="font-semibold">{s.kind === 'number' ? `${Number(s.value.toString())} ${s.unit ?? ''}`.trim() : s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <Suspense fallback={<BuyBoxSkeleton />}>
            <LiveBuyBox product={product} />
          </Suspense>
          <div className="flex items-center gap-5">
            <CompareToggle item={{ slug: product.slug, title: product.title, image: product.images[0], category: product.category, categoryName: product.categoryName }} className="text-[13px]" />
            <ShareButton title={product.title} />
          </div>
        </div>
      </section>

      <section className="mt-11 grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
        {product.specs.length > 0 ? <SpecTable specs={product.specs} unitsByKey={unitsByKey} /> : <div />}
        <div id="reviews" className="panel scroll-mt-40 p-5">
          <h2 className="heading mb-3 text-[28px]">Customer reviews</h2>
          <Suspense fallback={<div className="h-40" />}>
            <ReviewList productId={product.id} />
          </Suspense>
          <h3 className="heading mb-3 mt-8 text-[22px]">Write a review</h3>
          <ReviewForm productId={product.id} />
        </div>
      </section>
      <div className="mt-8">
        <Details product={product} />
      </div>
      <Suspense fallback={null}>
        <RelatedProducts product={product} />
      </Suspense>
      <RecentlyViewed current={{ slug: product.slug, title: product.title, image: product.images[0], price: lowestPrice(product) }} />
    </div>
  );
}
