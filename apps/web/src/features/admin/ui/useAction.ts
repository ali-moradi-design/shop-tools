'use client';

import { useCallback, useState, useTransition } from 'react';
import type { ActionResult } from '../model/action-result';

/**
 * Runs a Server Action in a transition: `pending` while it runs, then its result
 * (or the error it threw) for an inline message.
 */
const isNavigation = (err: unknown) =>
  typeof err === 'object' && err !== null && 'digest' in err && /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR)/.test(String(err.digest));

export function useAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = useCallback((action: () => Promise<ActionResult>, onDone?: (r: ActionResult) => void) => {
    setResult(null);
    startTransition(async () => {
      let r: ActionResult;
      try {
        r = await action();
      } catch (err) {
        // redirect() inside an action is handled by the router; let it through
        if (isNavigation(err)) throw err;
        r = { status: 'error', message: err instanceof Error ? err.message : 'Something went wrong' };
      }
      setResult(r);
      onDone?.(r);
    });
  }, []);
  return { pending, result, run, clear: useCallback(() => setResult(null), []) };
}
