import { cn } from '@/shared/lib/cn';
import type { ActionResult } from '../model/action-result';

/** The outcome of an admin action, announced to screen readers. */
export function ActionMessage({ result, className }: { result: ActionResult | null; className?: string }) {
  if (!result) return null;
  const ok = result.status === 'ok';
  return (
    <p role={ok ? 'status' : 'alert'} className={cn('text-[13px]', ok ? 'font-medium text-ink' : 'text-danger', className)}>
      {ok && <span aria-hidden>✓ </span>}
      {result.message}
    </p>
  );
}
