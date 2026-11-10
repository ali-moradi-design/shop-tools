import { Skeleton } from '@/shared/ui';

/** Shown instantly while an admin page streams in (inside the admin layout). */
export default function Loading() {
  return (
    <div>
      <p role="status" className="sr-only">Loading…</p>
      <Skeleton className="h-9 w-40" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)}
      </div>
      <div className="mt-12 space-y-3">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    </div>
  );
}
