import Link from 'next/link';
import type { SpecDefinition } from '@/entities/category';
import { ApiError } from '@/shared/api';
import { fetchProducts, ProductCard, type ProductQuery } from '@/entities/product';
import { CompareToggle } from '@/features/compare';

/** Product grid for a query, with page links. Runs inside a Suspense boundary. */
export async function ProductGrid({
  query,
  basePath,
  params,
  specDefs,
  columns = 3,
}: {
  query: ProductQuery;
  basePath: string;
  params: Record<string, string>;
  specDefs?: SpecDefinition[];
  columns?: 3 | 4;
}) {
  let result;
  try {
    result = await fetchProducts({ ...query, limit: 24 });
  } catch (err) {
    // a hand-edited URL (e.g. `spec.torque=abc`) is refused by the API: say so instead of crashing
    if (!(err instanceof ApiError) || err.status !== 400) throw err;
    return (
      <div className="panel px-6 py-20 text-center" data-testid="invalid-filters">
        <p className="heading text-[26px]">These filters are not valid.</p>
        <Link href={basePath} className="btn mt-6">Clear filters</Link>
      </div>
    );
  }
  const { data, meta } = result;

  if (data.length === 0) {
    return (
      <div className="panel px-6 py-20 text-center">
        <p className="heading text-[26px]">No tools match these filters.</p>
        <Link href={basePath} className="btn mt-6">Clear filters</Link>
      </div>
    );
  }

  const pageHref = (page: number) => {
    const sp = new URLSearchParams(params);
    if (page > 1) sp.set('page', String(page));
    else sp.delete('page');
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <>
      <p className="mb-3 font-mono text-[12px] text-mute" aria-live="polite" data-testid="result-count">
        {meta.total} {meta.total === 1 ? 'result' : 'results'}
      </p>
      <div className={columns === 4 ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
        {data.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            specDefs={specDefs}
            priority={i < 3}
            compare={
              <CompareToggle item={{ slug: p.slug, title: p.title, image: p.images[0], category: p.category, categoryName: p.categoryName }} />
            }
          />
        ))}
      </div>
      {meta.pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-2 font-mono text-[13px]">
          {meta.page > 1 && <Link className="border border-ink bg-white px-3 py-2 hover:bg-ink hover:text-white" href={pageHref(meta.page - 1)}>‹ Prev</Link>}
          <span className="px-3 text-mute">Page {meta.page} of {meta.pages}</span>
          {meta.page < meta.pages && <Link className="border border-ink bg-white px-3 py-2 hover:bg-ink hover:text-white" href={pageHref(meta.page + 1)}>Next ›</Link>}
        </nav>
      )}
    </>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="panel h-[420px] animate-pulse" />
      ))}
    </div>
  );
}
