import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient, type Prisma } from '@prisma/client';

/** A client or the client of an open transaction: both run the same queries. */
export type PrismaTx = PrismaClient | Prisma.TransactionClient;

const globalForPrisma = globalThis as unknown as { __shopPrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__shopPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// keep one client across hot reloads in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__shopPrisma = prisma;
}

const txStore = new AsyncLocalStorage<PrismaTx>();

/**
 * The client repositories must use: the transaction client while a unit of work
 * is running, the shared client otherwise. Repositories never receive the
 * transaction explicitly, so application code stays free of database types.
 */
export function getPrisma(): PrismaTx {
  return txStore.getStore() ?? prisma;
}

export function runWithPrismaTx<T>(tx: Prisma.TransactionClient, fn: () => Promise<T>): Promise<T> {
  return txStore.run(tx, fn);
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
