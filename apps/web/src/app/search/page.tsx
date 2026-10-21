import type { Metadata } from 'next';
import { Suspense } from 'react';
import { readFilters, toProductQuery } from '@/features/catalog-filters';
import { ProductGrid, GridSkeleton } from '@/widgets/catalog';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Results({ searchParams }: Props) {
  const filters = readFilters(await searchParams);
  if (!filters.q) {
    return <p className="px-4 py-16 text-center text-mute">Type a style, color or leather, e.g. “Captain” or “suede”.</p>;
  }
  return <ProductGrid basePath="/search" params={filters as Record<string, string>} query={toProductQuery(filters)} />;
}

async function SearchBox({ searchParams }: Props) {
  const q = readFilters(await searchParams).q ?? '';
  return (
    <form action="/search" role="search" className="mx-auto mt-6 flex max-w-xl border-b border-ink">
      <label htmlFor="q" className="sr-only">Search products</label>
      <input id="q" name="q" defaultValue={q} autoFocus placeholder="Search boots, bags, leather…" className="min-w-0 flex-1 bg-transparent py-3 text-[17px] outline-none" />
      <button type="submit" className="eyebrow">Search</button>
    </form>
  );
}

export default function SearchPage({ searchParams }: Props) {
  return (
    <div className="pb-24">
      <div className="px-4 pt-14 text-center">
        <h1 className="heading text-[32px]">Search</h1>
        <Suspense fallback={<div className="mx-auto mt-6 h-[52px] max-w-xl border-b border-ink" />}>
          <SearchBox searchParams={searchParams} />
        </Suspense>
      </div>
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
