import Link from 'next/link';

/** Previous / next links that keep the current filters. */
export function Pagination({
  path,
  params,
  page,
  pages,
  total,
  noun,
}: {
  path: string;
  params: Record<string, string | undefined>;
  page: number;
  pages: number;
  total: number;
  noun: string;
}) {
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  };
  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center gap-6 text-[14px]">
      {page > 1 && <Link className="link-underline" href={href(page - 1)}>← Previous</Link>}
      <span className="text-mute">
        Page {page} of {Math.max(1, pages)} · {total} {noun}
      </span>
      {page < pages && <Link className="link-underline" href={href(page + 1)}>Next →</Link>}
    </nav>
  );
}
