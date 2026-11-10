import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Product } from '@/entities/product';
import { PageHeader, Pagination, TrashTable } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import type { ApiPaginated } from '@/shared/api';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Trash' };

type Props = { searchParams: Promise<{ page?: string }> };

async function Trash({ searchParams }: Props) {
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);
  const list = early(serverApi<ApiPaginated<Product>>(`/products/trash?page=${page}&limit=30`));
  await requireAdmin('/admin/products/trash');
  const { data, meta } = await list;
  return (
    <>
      <TrashTable rows={data.map((p) => ({ id: p.id, title: p.title, image: p.images[0], stock: p.stock }))} />
      <Pagination path="/admin/products/trash" params={{}} page={meta.page} pages={meta.pages} total={meta.total} noun="deleted products" />
    </>
  );
}

export default function TrashPage(props: Props) {
  return (
    <div>
      <Link href="/admin/products" className="text-[13px] text-mute underline">← All products</Link>
      <div className="mt-3">
        <PageHeader title="Trash" />
      </div>
      <p className="mb-5 text-[14px] text-mute">Deleted products are hidden from the shop. Restore one to sell it again.</p>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Trash {...props} />
      </Suspense>
    </div>
  );
}
