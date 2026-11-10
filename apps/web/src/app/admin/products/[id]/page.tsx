import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { fetchCategories, fetchWarehouses } from '@/entities/category';
import type { Product } from '@/entities/product';
import { PageHeader, ProductForm } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Edit product' };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

async function readProduct(id: string): Promise<Product> {
  try {
    return (await serverApi<{ data: Product }>(`/products/${encodeURIComponent(id)}`)).data;
  } catch (err) {
    if (err instanceof ApiError && [400, 404].includes(err.status)) notFound();
    throw err;
  }
}

async function Editor({ params, searchParams }: Props) {
  const { id } = await params;
  const reads = early(Promise.all([readProduct(id), fetchCategories(), fetchWarehouses(), searchParams]));
  await requireAdmin(`/admin/products/${id}`);
  const [product, categories, warehouses, { created }] = await reads;
  return (
    <>
      <PageHeader title={product.title}>
        <Link href={`/products/${product.slug}`} target="_blank" className="text-[14px] text-mute underline underline-offset-4">View in shop ↗</Link>
      </PageHeader>
      {created && <p role="status" className="mb-6 border-2 border-ink bg-accent px-4 py-3 text-[14px] text-accent-ink">Product created. It is live in the shop.</p>}
      {/* keyed by product, not by save: the form resets itself after a save and keeps its message */}
      <ProductForm key={product.id} product={product} categories={categories} warehouses={warehouses} />
    </>
  );
}

export default function AdminProductPage(props: Props) {
  return (
    <div>
      <Link href="/admin/products" className="text-[13px] text-mute underline">← All products</Link>
      <div className="mt-3">
        <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
          <Editor {...props} />
        </Suspense>
      </div>
    </div>
  );
}
