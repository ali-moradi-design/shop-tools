import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fetchFacets } from '@/entities/product';
import { FilterBar, readFilters, toProductQuery } from '@/features/catalog-filters';
import { ProductGrid, GridSkeleton } from '@/widgets/catalog';
import { findCollection, type Collection } from '@/shared/config';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = findCollection((await params).slug);
  if (!c) return {};
  return {
    title: c.title,
    description: `${c.title} — ${c.tagline} Free shipping and returns.`,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { images: [c.hero] },
  };
}

/** Reads the URL filters, so it is a dynamic hole inside the static page shell. */
async function Results({ collection, searchParams }: { collection: Collection; searchParams: Props['searchParams'] }) {
  const filters = readFilters(await searchParams);
  return (
    <ProductGrid
      basePath={`/collections/${collection.slug}`}
      params={filters as Record<string, string>}
      query={{ ...toProductQuery(filters), category: collection.category, gender: collection.gender }}
    />
  );
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const collection = findCollection((await params).slug);
  if (!collection) notFound();
  const facets = await fetchFacets({ category: collection.category, gender: collection.gender });

  return (
    <>
      <section className="relative flex h-[220px] items-center text-white sm:h-[316px]">
        <Image src={collection.hero} alt="" fill priority sizes="100vw" className="object-cover object-[center_70%]" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative px-6 text-center sm:ml-[140px]">
          <h1 className="heading text-[32px] sm:text-[38px]">{collection.title}</h1>
          <p className="mt-3 text-[15px] font-medium tracking-[0.12em] sm:text-[17px]">{collection.tagline}</p>
        </div>
      </section>
      <Suspense fallback={<div className="h-[57px] border-b border-line" />}>
        <FilterBar facets={facets} chips={collection.chips} />
      </Suspense>
      <Suspense fallback={<GridSkeleton />}>
        <Results collection={collection} searchParams={searchParams} />
      </Suspense>
      <div className="h-24" />
    </>
  );
}
