import { afterAll, describe, expect, it } from 'vitest';
import { prisma, getPrisma, disconnectPrisma } from '../../src/shared/infra/prisma/client';
import { PrismaUnitOfWork } from '../../src/shared/infra/uow/prisma-unit-of-work';

describe('MySQL foundation', () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it('has every migrated table', async () => {
    const rows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`;
    const names = rows.map((r) => r.name);
    for (const table of ['User', 'Product', 'ProductVariant', 'Cart', 'Order', 'OrderItem']) {
      expect(names).toContain(table);
    }
  });

  it('commits a unit of work and rolls it back on error', async () => {
    const uow = new PrismaUnitOfWork();
    const slug = 'tx-check';

    await expect(
      uow.runInTransaction(async () => {
        await getPrisma().discount.create({ data: { code: slug, type: 'fixed', value: 100 } });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await prisma.discount.findUnique({ where: { code: slug } })).toBeNull();

    await uow.runInTransaction(async () => {
      await getPrisma().discount.create({ data: { code: slug, type: 'fixed', value: 100 } });
    });
    expect(await prisma.discount.findUnique({ where: { code: slug } })).not.toBeNull();
    await prisma.discount.delete({ where: { code: slug } });
  });
});
