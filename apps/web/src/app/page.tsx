import { Suspense } from 'react';
import { fetchCategories } from '@/entities/category';
import { fetchFacets, fetchProducts, ProductCard } from '@/entities/product';
import { CompareToggle } from '@/features/compare';
import { CategoryTiles, Hero, SectionHead, WarehouseBand } from '@/widgets/home';

async function Popular() {
  const { data } = await fetchProducts({ featured: true, limit: 4 });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((p, i) => (
        <ProductCard
          key={p.id}
          product={p}
          badge={i === 0 ? 'Best seller' : undefined}
          compare={<CompareToggle item={{ slug: p.slug, title: p.title, image: p.images[0], category: p.category, categoryName: p.categoryName }} />}
        />
      ))}
    </div>
  );
}

async function Warehouses() {
  const facets = await fetchFacets();
  return <WarehouseBand warehouses={facets.warehouses} />;
}

export default async function HomePage() {
  const categories = await fetchCategories();
  const productCount = categories.reduce((n, c) => n + (c.productCount ?? 0), 0);
  return (
    <>
      <Hero productCount={productCount} categoryCount={categories.length} />
      <div className="container-page space-y-12 pt-10">
        <section>
          <SectionHead title="Shop by category" />
          <CategoryTiles categories={categories} />
        </section>
        <section>
          <SectionHead title="Popular right now" href="/categories/drills" linkLabel="All drills" />
          <Suspense fallback={<div className="h-[420px]" />}>
            <Popular />
          </Suspense>
        </section>
        <Suspense fallback={<div className="h-[200px]" />}>
          <Warehouses />
        </Suspense>
      </div>
    </>
  );
}
