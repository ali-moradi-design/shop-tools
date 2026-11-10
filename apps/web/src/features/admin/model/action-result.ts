import type { Product } from '@/entities/product';

/** What an admin Server Action reports back to the form or table that ran it. */
export type ActionResult =
  | { status: 'ok'; message: string; product?: Product }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> };
