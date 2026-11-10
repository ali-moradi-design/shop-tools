import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ImportProducts, PageHeader } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Import products' };

const COLUMNS = [
  ['slug', 'URL name; an existing slug updates that product'],
  ['title, brand, model', 'as in the product form'],
  ['category', 'drills, saws, hand-tools… (the slug of a category)'],
  ['price, compare_at_price', 'in dollars, e.g. 249.00'],
  ['options', '“DCD805 / Body only / 149.00 / BER 4, HAM 2, MUC 0 | …”: SKU, name, own price (may be empty), stock per warehouse'],
  ['specs', '“voltage=18 | motor=Brushless”: numbers in the unit of the category'],
  ['images, features, tags', 'several values split by |'],
  ['featured', 'yes to feature it'],
];

/** Hides the form from anyone who is not staff (the import action checks again). */
async function Guarded() {
  await requireAdmin('/admin/products/import');
  return <ImportProducts />;
}

export default function ImportProductsPage() {
  return (
    <div>
      <Link href="/admin/products" className="text-[13px] text-mute underline">← Products</Link>
      <div className="mt-3">
        <PageHeader title="Import products">
          <a href="/api/v1/admin/export/products.csv" download className="text-[13px] underline underline-offset-4">Download the current catalog</a>
        </PageHeader>
      </div>
      <p className="-mt-3 mb-6 max-w-2xl text-[14px] text-mute">Export the catalog, edit it in a spreadsheet, and import it back. Checking the file changes nothing; it lists the rows that need fixing.</p>
      <Suspense fallback={<Skeleton className="h-40 w-full max-w-md" />}>
        <Guarded />
      </Suspense>
      <section className="mt-12 max-w-2xl text-[14px]">
        <h2 className="heading mb-3 text-[18px]">Columns</h2>
        <dl className="divide-y divide-line border-y border-line">
          {COLUMNS.map(([k, v]) => (
            <div key={k} className="grid gap-2 py-2 sm:grid-cols-[220px_1fr]">
              <dt className="font-mono text-[13px]">{k}</dt>
              <dd className="text-mute">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
