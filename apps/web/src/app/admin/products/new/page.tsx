import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { fetchCategories, fetchWarehouses } from '@/entities/category';
import { PageHeader, ProductForm } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'New product' };

async function NewProduct() {
  const reads = early(Promise.all([fetchCategories(), fetchWarehouses()]));
  await requireAdmin('/admin/products/new');
  const [categories, warehouses] = await reads;
  return <ProductForm categories={categories} warehouses={warehouses} />;
}

export default function NewProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="text-[13px] text-mute underline">← All products</Link>
      <div className="mt-3">
        <PageHeader title="New product" />
      </div>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <NewProduct />
      </Suspense>
    </div>
  );
}
