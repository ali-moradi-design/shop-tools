import type { Metadata } from 'next';
import { Suspense } from 'react';
import { readFilters, toProductQuery } from '@/features/catalog-filters';
import { ProductGrid, GridSkeleton } from '@/widgets/catalog';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Results({ searchParams }: Props) {
  const filters = readFilters(await searchParams);
  if (!filters.q) {
    return <p className="panel px-6 py-16 text-center text-mute">Type a tool, a brand, an SKU or a spec, e.g. “hammer drill” or “DCD805”.</p>;
  }
  return <ProductGrid basePath="/search" params={filters} query={toProductQuery({ q: filters.q, page: filters.page ?? '1' })} columns={4} />;
}

async function SearchBox({ searchParams }: Props) {
  const q = readFilters(await searchParams).q ?? '';
  return (
    <form action="/search" role="search" className="mx-auto mt-5 flex max-w-xl border-2 border-ink bg-white">
      <label htmlFor="q" className="sr-only">Search products</label>
      <input id="q" name="q" defaultValue={q} autoFocus placeholder="Search tools, SKUs or brands…" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[16px] outline-none" />
      <button type="submit" className="bg-ink px-6 font-mono text-[12px] tracking-[0.1em] text-white hover:text-accent">SEARCH</button>
    </form>
  );
}

export default function SearchPage({ searchParams }: Props) {
  return (
    <div className="container-page pb-28 pt-10">
      <div className="mb-8 text-center">
        <h1 className="heading text-[44px] leading-none">Search</h1>
        <Suspense fallback={<div className="mx-auto mt-5 h-[52px] max-w-xl border-2 border-ink" />}>
          <SearchBox searchParams={searchParams} />
        </Suspense>
      </div>
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
