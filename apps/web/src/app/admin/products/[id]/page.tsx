import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Product } from '@/entities/product';
import { PageHeader, ProductEditor } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { fetchWarehouses } from '@/entities/category';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

type Props = { params: Promise<{ id: string }> };

async function Editor({ params }: Props) {
  const { id } = await params;
  const warehousesRead = early(fetchWarehouses());
  const productRead = early(serverApi<{ data: Product }>(`/products/${encodeURIComponent(id)}`));
  await requireAdmin(`/admin/products/${id}`);
  const warehouses = await warehousesRead;
  let product: Product;
  try {
    product = (await productRead).data;
  } catch (err) {
    if (err instanceof ApiError && [400, 404].includes(err.status)) notFound();
    throw err;
  }
  return (
    <>
      <div className="mb-8 flex items-center gap-5">
        <div className="relative h-24 w-24 bg-paper">{product.images[0] && <Image src={product.images[0]} alt="" fill sizes="96px" className="object-contain" />}</div>
        <div>
          <h2 className="heading text-[24px]">{product.title}</h2>
          <Link href={`/products/${product.slug}`} className="link-underline text-[13px] text-mute">View in shop</Link>
        </div>
      </div>
      <ProductEditor product={product} warehouses={warehouses} />
    </>
  );
}

export default function AdminProductPage(props: Props) {
  return (
    <>
      <Link href="/admin/products" className="text-[13px] text-mute underline">← All products</Link>
      <div className="mt-3">
        <PageHeader title="Edit product" />
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Editor {...props} />
        </Suspense>
      </div>
    </>
  );
}
