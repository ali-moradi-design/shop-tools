import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  fetchColors,
  fetchLiveVariants,
  fetchProduct,
  fetchProducts,
  type Product,
} from '@/entities/product';
import { BuyBox, BuyBoxSkeleton } from '@/features/add-to-cart';
import { FavoriteButton } from '@/features/favorite';
import { ReviewForm, ReviewList } from '@/features/reviews';
import { ColorPicker, Details, Editorial, Gallery } from '@/widgets/product-detail';
import { COLLECTIONS, SITE } from '@/shared/config';
import { formatMoney } from '@/shared/lib/money';
import { Icon, Stars } from '@/shared/ui';

type Props = { params: Promise<{ slug: string }> };

/** Featured products are prerendered at build time; the rest on first visit. */
export async function generateStaticParams() {
  const { data } = await fetchProducts({ featured: true, limit: 24 });
  return data.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.title,
    description: `${product.title} — ${product.features.slice(0, 2).join(', ')}. ${formatMoney(product.price)}, free shipping and returns.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { images: product.images.slice(0, 1), type: 'website' },
  };
}

function collectionOf(p: Product) {
  return (
    COLLECTIONS.find((c) => c.category === p.category && c.gender === p.gender) ??
    COLLECTIONS.find((c) => c.category === p.category)
  );
}

/** Live stock per size: a dynamic hole in the prerendered product page. */
async function LiveBuyBox({ product }: { product: Product }) {
  const variants = await fetchLiveVariants(product.slug);
  const sizeNote = product.category === 'boots' ? 'Order ½ size smaller than you wear in sneakers.' : undefined;
  return <BuyBox productId={product.id} price={product.price} variants={variants} sizeNote={sizeNote} />;
}

function JsonLd({ product }: { product: Product }) {
  const collection = collectionOf(product);
  const url = `${SITE.url}/products/${product.slug}`;
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: product.images,
      description: product.description,
      sku: product.variants[0]?.sku,
      color: product.color,
      material: product.leather,
      brand: { '@type': 'Brand', name: SITE.name },
      ...(product.ratingCount > 0 && {
        aggregateRating: { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount },
      }),
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: product.currency,
        price: (product.price / 100).toFixed(2),
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        ...(collection
          ? [{ '@type': 'ListItem', position: 2, name: collection.title, item: `${SITE.url}/collections/${collection.slug}` }]
          : []),
        { '@type': 'ListItem', position: collection ? 3 : 2, name: product.title, item: url },
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
  const colors = await fetchColors(product.slug);
  const collection = collectionOf(product);

  return (
    <>
      <JsonLd product={product} />
      <nav aria-label="Breadcrumb" className="px-4 py-4 text-[13px] text-mute sm:px-[58px]">
        <Link href="/" className="text-ink underline underline-offset-[3px]">Home</Link>
        {collection && (
          <>
            {' › '}
            <Link href={`/collections/${collection.slug}`} className="text-ink underline underline-offset-[3px]">{collection.title}</Link>
          </>
        )}
        {' › '}
        <span aria-current="page">{product.name}</span>
      </nav>
      <section className="grid gap-10 px-4 sm:px-[58px] lg:grid-cols-[730px_1fr] lg:gap-[50px]">
        <Gallery images={product.images} title={product.title} />
        <div className="lg:sticky lg:top-[180px] lg:self-start">
          <div className="flex items-start justify-between gap-4">
            <h1 className="heading text-[30px]">{product.name}</h1>
            <FavoriteButton productId={product.id} />
          </div>
          <p className="my-2 text-[16px]">
            {product.compareAtPrice && <s className="mr-2 text-mute">{formatMoney(product.compareAtPrice)}</s>}
            {formatMoney(product.price)} or 4 payments of {formatMoney(Math.round(product.price / 4))}
          </p>
          <p className="flex items-center gap-2 text-[14.5px]">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-ink text-white">
              <Icon name="check" width={10} height={10} strokeWidth={3} />
            </span>
            Honest Pricing Guarantee
          </p>
          {product.ratingCount > 0 && (
            <a href="#reviews" className="mt-2 flex items-center gap-2 text-[14px]">
              <Stars value={product.ratingAvg} />
              <span className="underline">{product.ratingAvg.toFixed(1)} ({product.ratingCount} reviews)</span>
            </a>
          )}
          <ColorPicker current={product} colors={colors} />
          <Suspense fallback={<BuyBoxSkeleton />}>
            <LiveBuyBox product={product} />
          </Suspense>
        </div>
      </section>
      <Details product={product} />
      <Editorial product={product} />
      <section id="reviews" className="scroll-mt-40 px-4 py-16 sm:px-[58px]">
        <h2 className="heading mb-6 text-[28px]">Reviews</h2>
        <Suspense fallback={<div className="h-40" />}>
          <ReviewList slug={product.slug} />
        </Suspense>
        <h3 className="heading mb-4 mt-12 text-[22px]">Write a review</h3>
        <ReviewForm productId={product.id} />
      </section>
    </>
  );
}
