import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fetchCategory } from '@/entities/category';
import { fetchFacets } from '@/entities/product';
import { ActiveFilters, FilterSidebar, readFilters, SortSelect, toProductQuery } from '@/features/catalog-filters';
import { ProductGrid, GridSkeleton } from '@/widgets/catalog';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await fetchCategory((await params).slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `${category.name}: filter by ${category.specs.filter((s) => s.filterable).slice(0, 3).map((s) => s.label.toLowerCase()).join(', ')} and compare up to four products.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const slug = (await params).slug;
  const category = await fetchCategory(slug);
  if (!category) notFound();
  const [facets, sp] = await Promise.all([fetchFacets({ category: slug }), searchParams]);
  const filters = readFilters(sp);
  const basePath = `/categories/${slug}`;

  return (
    <div className="container-page pb-28">
      <nav aria-label="Breadcrumb" className="py-4 font-mono text-[12px] text-mute">
        <Link href="/" className="hover:text-ink">Home</Link> / <span className="text-ink">{category.name}</span>
      </nav>
      <div className="mb-3 flex flex-wrap items-end gap-4">
        <h1 className="heading text-[44px] leading-none sm:text-[54px]">{category.name}</h1>
        <span className="flex-1" />
        <Suspense fallback={null}>
          <SortSelect />
        </Suspense>
      </div>
      <p className="mb-4 max-w-2xl text-steel">{category.description}</p>
      <ActiveFilters params={filters} facets={facets} basePath={basePath} />
      <div className="grid items-start gap-7 lg:grid-cols-[290px_1fr]">
        <Suspense fallback={<div className="panel h-[400px]" />}>
          <FilterSidebar facets={facets} />
        </Suspense>
        <div>
          <Suspense fallback={<GridSkeleton />}>
            <ProductGrid basePath={basePath} params={filters} query={toProductQuery(filters, slug)} specDefs={category.specs} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
