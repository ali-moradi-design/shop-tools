import { apiGetJson } from '@/shared/api';
import { Stars } from '@/shared/ui';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: { name?: string } | string;
}

interface Summary {
  avg: number;
  count: number;
  /** Reviews per star; index 0 is one star. */
  stars: number[];
}

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

/** Rating summary with a bar per star, then the latest reviews; both read fresh, in parallel. */
export async function ReviewList({ productId }: { productId: string }) {
  const [{ data: summary }, { data }] = await Promise.all([
    apiGetJson<{ data: Summary }>(`/reviews/summary?product=${encodeURIComponent(productId)}`, { cache: 'no-store' }),
    apiGetJson<{ data: Review[] }>(`/reviews?product=${encodeURIComponent(productId)}&limit=20`, { cache: 'no-store' }),
  ]);
  if (summary.count === 0) return <p className="text-[14px] text-mute">No reviews yet. Be the first to review this product.</p>;
  return (
    <>
      <div className="mb-6 grid items-center gap-5 sm:grid-cols-[auto_1fr]" data-testid="rating-summary">
        <p className="text-center">
          <span className="block font-display text-[48px] font-bold leading-none">{summary.avg.toFixed(1)}</span>
          <Stars value={summary.avg} className="mt-1 block" />
          <span className="font-mono text-[12px] text-mute">{summary.count} {summary.count === 1 ? 'review' : 'reviews'}</span>
        </p>
        <ul className="space-y-1 font-mono text-[12px]" aria-label="Reviews per star">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = summary.stars[star - 1] ?? 0;
            return (
              <li key={star} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2">
                <span>{star} ★</span>
                <span className="h-2.5 bg-line-soft" aria-hidden>
                  <span className="block h-full bg-ink" style={{ width: `${(n / summary.count) * 100}%` }} />
                </span>
                <span className="text-right text-mute">
                  {n}
                  <span className="sr-only"> {n === 1 ? 'review' : 'reviews'} with {star} {star === 1 ? 'star' : 'stars'}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="space-y-3">
        {data.map((r) => (
          <li key={r.id} className="border-t border-line-soft pt-3 text-[14px]" data-testid="review">
            <Stars value={r.rating} />
            {r.comment && <p className="mt-1.5">{r.comment}</p>}
            <p className="mt-1.5 text-[12px] text-mute">
              {typeof r.user === 'object' && r.user.name ? r.user.name : 'Customer'} · {day.format(new Date(r.createdAt))}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
