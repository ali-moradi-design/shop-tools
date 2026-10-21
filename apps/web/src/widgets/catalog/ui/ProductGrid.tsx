import Link from 'next/link';
import { fetchProducts, ProductCard, type ProductQuery } from '@/entities/product';

/** Product grid for a query, with simple page links. Runs inside a Suspense hole. */
export async function ProductGrid({
  query,
  basePath,
  params,
}: {
  query: ProductQuery;
  basePath: string;
  params: Record<string, string>;
}) {
  const { data, meta } = await fetchProducts({ ...query, limit: 24 });

  if (data.length === 0) {
    return (
      <div className="px-4 py-24 text-center sm:px-[70px]">
        <p className="heading text-[24px]">No styles match these filters.</p>
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
      <p className="eyebrow px-4 pb-3.5 pt-5 text-mute sm:px-[70px]" aria-live="polite">
        {meta.total} {meta.total === 1 ? 'style' : 'styles'}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 px-4 sm:px-[70px] lg:grid-cols-4">
        {data.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </div>
      {meta.pages > 1 && (
        <nav aria-label="Pages" className="mt-14 flex items-center justify-center gap-6 text-[14px]">
          {meta.page > 1 ? <Link className="link-underline" href={pageHref(meta.page - 1)}>Previous</Link> : <span />}
          <span className="text-mute">Page {meta.page} of {meta.pages}</span>
          {meta.page < meta.pages ? <Link className="link-underline" href={pageHref(meta.page + 1)}>Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 px-4 pt-14 sm:px-[70px] lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="aspect-square animate-pulse bg-soft" />
          <div className="mt-3 h-4 w-2/3 bg-soft" />
        </div>
      ))}
    </div>
  );
}
