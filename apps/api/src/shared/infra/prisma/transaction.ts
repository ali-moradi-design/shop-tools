import { getPrisma, prisma, type PrismaTx } from './client';

/**
 * Runs `fn` inside the unit of work that is already open, or in a transaction of its
 * own when there is none. Repositories use it for multi-step writes that must be all-or-nothing.
 */
export function runInTransaction<T>(fn: (tx: PrismaTx) => Promise<T>): Promise<T> {
  const client = getPrisma();
  return client === prisma ? prisma.$transaction((tx) => fn(tx), { timeout: 15_000 }) : fn(client);
}
