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
import { Details, Gallery } from '@/widgets/product-detail';
import { SITE } from '@/shared/config';
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
  const [variants, warehouses] = await Promise.all([fetchLiveVariants(product.slug), fetchWarehouses()]);
  return <BuyBox productId={product.id} price={product.price} variants={variants} warehouses={warehouses} />;
}

function JsonLd({ product }: { product: Product }) {
  const url = `${SITE.url}/products/${product.slug}`;
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: product.images.map((i) => (i.startsWith('/') ? `${SITE.url}${i}` : i)),
      description: product.description,
      sku: product.variants[0]?.sku,
      mpn: product.model,
      brand: { '@type': 'Brand', name: product.brand || SITE.name },
      category: product.categoryName,
      ...(product.ratingCount > 0 && {
        aggregateRating: { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount },
      }),
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: product.currency,
        price: (lowestPrice(product) / 100).toFixed(2),
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: product.categoryName, item: `${SITE.url}/categories/${product.category}` },
        { '@type': 'ListItem', position: 3, name: product.title, item: url },
      ],
    },
  ];
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be inline; the content is our own catalog data, escaped for </script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export default async function ProductPage({ params }: Props) {
  const product = await fetchProduct((await params).slug);
  if (!product) notFound();
  const category = await fetchCategory(product.category);
  const unitsByKey = Object.fromEntries((category?.specs ?? []).map((s) => [s.key, s.units]));
  const keySpecs = product.specs.slice(0, 5);

  return (
    <div className="container-page pb-28">
      <JsonLd product={product} />
      <nav aria-label="Breadcrumb" className="py-4 font-mono text-[12px] text-mute">
        <Link href="/" className="hover:text-ink">Home</Link> /{' '}
        <Link href={`/categories/${product.category}`} className="hover:text-ink">{product.categoryName}</Link> /{' '}
        <span className="text-ink" aria-current="page">{product.model ?? product.slug}</span>
      </nav>
      <section className="grid gap-9 lg:grid-cols-[1.1fr_1fr]">
        <Gallery images={product.images} title={product.title} badge={product.compareAtPrice ? `Save ${formatMoney(product.compareAtPrice - product.price)}` : undefined} />
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
            {product.compareAtPrice && <s className="font-mono text-mute">{formatMoney(product.compareAtPrice, product.currency)}</s>}
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
          <CompareToggle item={{ slug: product.slug, title: product.title, image: product.images[0], category: product.category, categoryName: product.categoryName }} className="text-[13px]" />
        </div>
      </section>

      <section className="mt-11 grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
        {product.specs.length > 0 ? <SpecTable specs={product.specs} unitsByKey={unitsByKey} /> : <div />}
        <div id="reviews" className="panel scroll-mt-40 p-5">
          <h2 className="heading mb-3 text-[28px]">Customer reviews</h2>
          <Suspense fallback={<div className="h-40" />}>
            <ReviewList slug={product.slug} />
          </Suspense>
          <h3 className="heading mb-3 mt-8 text-[22px]">Write a review</h3>
          <ReviewForm productId={product.id} />
        </div>
      </section>
      <div className="mt-8">
        <Details product={product} />
      </div>
    </div>
  );
}
