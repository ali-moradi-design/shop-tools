import { cn } from '../lib/cn';

/** A pulsing placeholder block; size it with classes. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse bg-line-soft', className)} />;
}
