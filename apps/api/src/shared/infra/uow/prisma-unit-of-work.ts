import type { IUnitOfWork, UnitOfWorkSession } from '../../application/unit-of-work.port';
import { prisma, runWithPrismaTx } from '../prisma/client';

/** Runs `fn` in one MySQL transaction; every repository call inside uses it. */
export class PrismaUnitOfWork implements IUnitOfWork {
  runInTransaction<T>(fn: (session: UnitOfWorkSession | null) => Promise<T>): Promise<T> {
    return prisma.$transaction((tx) => runWithPrismaTx(tx, () => fn(tx)), {
      maxWait: 5_000,
      timeout: 15_000,
    });
  }
}
