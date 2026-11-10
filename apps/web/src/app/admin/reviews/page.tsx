import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader, Pagination, ReviewsTable, type ReviewRow } from '@/features/admin';
import { requireAdmin } from '@/features/auth/server';
import { serverApi } from '@/shared/api/server';
import { early } from '@/shared/lib/early';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Reviews' };

type Props = { searchParams: Promise<{ page?: string }> };

interface ApiReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: { name?: string } | string;
  product: { title: string; slug: string } | string;
}

const LIMIT = 30;

async function Reviews({ searchParams }: Props) {
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);
  const list = early(serverApi<{ data: ApiReview[]; meta: { total: number } }>(`/reviews?page=${page}&limit=${LIMIT}`));
  await requireAdmin('/admin/reviews');
  const { data, meta } = await list;
  const rows: ReviewRow[] = data.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    author: typeof r.user === 'object' && r.user.name ? r.user.name : 'Customer',
    product: typeof r.product === 'object' ? { title: r.product.title, slug: r.product.slug } : undefined,
  }));
  return (
    <>
      <ReviewsTable rows={rows} />
      <Pagination path="/admin/reviews" params={{}} page={page} pages={Math.ceil(meta.total / LIMIT)} total={meta.total} noun="reviews" />
    </>
  );
}

export default function AdminReviewsPage(props: Props) {
  return (
    <div>
      <PageHeader title="Reviews" />
      <p className="-mt-3 mb-5 text-[14px] text-mute">Newest first. Removing a review updates the product’s rating in the shop.</p>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Reviews {...props} />
      </Suspense>
    </div>
  );
}
