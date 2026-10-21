'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/shared/api/types';
import { clientApi } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui/Icon';

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'login'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rating) return setError('Please choose a rating.');
    const comment = String(new FormData(e.currentTarget).get('comment') ?? '').trim();
    setState('busy');
    setError(null);
    try {
      await clientApi('/reviews', {
        method: 'POST',
        body: JSON.stringify({ product: productId, rating, ...(comment && { comment }) }),
      });
      setState('done');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return setState('login');
      setError(err instanceof Error ? err.message : 'Could not save your review');
      setState('idle');
    }
  };

  if (state === 'done') return <p role="status" className="text-[14px]">Thanks for your review!</p>;
  if (state === 'login') {
    return (
      <p className="text-[14px]">
        Please <Link className="link-underline" href={`/account/login?next=${encodeURIComponent(pathname + '#reviews')}`}>sign in</Link> to write a review.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-3 text-[14px]">
      <fieldset>
        <legend className="mb-1">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={rating === n} onClick={() => setRating(n)}>
              <Icon name="star" width={24} height={24} fill={n <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        Your review (optional)
        <textarea name="comment" rows={4} maxLength={2000} className="mt-1 block w-full border border-line p-3 outline-none focus:border-ink" />
      </label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button type="submit" disabled={state === 'busy'} className={cn('btn')}>Submit review</button>
    </form>
  );
}
