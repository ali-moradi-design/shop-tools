import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchComparison } from '@/entities/product';
import { CompareTable } from '@/features/compare';

export const metadata: Metadata = { title: 'Compare tools', robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ComparePage({ searchParams }: Props) {
  const raw = (await searchParams).slugs;
  const slugs = (Array.isArray(raw) ? raw[0] : raw ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const comparison = slugs.length >= 2 ? await fetchComparison(slugs) : null;

  return (
    <div className="container-page pb-28 pt-4">
      <nav aria-label="Breadcrumb" className="py-4 font-mono text-[12px] text-mute">
        <Link href="/" className="hover:text-ink">Home</Link> / <span className="text-ink">Compare</span>
      </nav>
      {comparison ? (
        <CompareTable comparison={comparison} />
      ) : (
        <div className="panel mx-auto max-w-xl p-10 text-center">
          <h1 className="heading text-[34px]">Pick tools to compare</h1>
          <p className="mt-3 text-steel">
            Tick “Compare” on two to four tools of the same category, then open this page.
            {slugs.length >= 2 && ' The tools in this link could not be compared (different categories or not found).'}
          </p>
          <Link href="/" className="btn mt-6">Browse tools</Link>
        </div>
      )}
    </div>
  );
}
