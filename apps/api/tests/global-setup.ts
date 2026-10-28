import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://root:root@127.0.0.1:33100/toolbench_test';

/**
 * Builds a clean MySQL database for the whole test run: drop, create, apply the
 * real migrations. The name must end with `_test` so this can never touch real data.
 */
export default async function setup(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.replace(/^\//, '');
  if (!/^[a-z0-9_]+_test$/.test(dbName)) {
    throw new Error(`Refusing to reset "${dbName}": a test database name must end with _test`);
  }

  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = '/mysql';
  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await admin.$executeRawUnsafe(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
