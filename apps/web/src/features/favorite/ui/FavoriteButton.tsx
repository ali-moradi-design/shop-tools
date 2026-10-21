'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError } from '@/shared/api/types';
import { clientApi } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui/Icon';

/** Heart toggle; visitors are sent to sign-in first. */
export function FavoriteButton({ productId, className }: { productId: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    clientApi<{ data: { productId: string }[] }>('/favorites')
      .then((r) => alive && setSaved(r.data.some((f) => f.productId === productId)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [productId]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (saved) await clientApi(`/favorites/${productId}`, { method: 'DELETE' });
      else await clientApi('/favorites', { method: 'POST', body: JSON.stringify({ productId }) });
      setSaved(!saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/account/login?next=${encodeURIComponent(pathname)}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
      className={cn('grid h-11 w-11 shrink-0 place-items-center border border-line hover:border-ink', className)}
      data-testid="favorite"
    >
      <Icon name="heart" fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
