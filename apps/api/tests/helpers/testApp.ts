import request from 'supertest';
import type { Express } from 'express';
import { prisma, disconnectPrisma } from '../../src/shared/infra/prisma/client';

export type TestAgent = ReturnType<typeof request>;

export type TestContext = {
  app: Express;
  request: TestAgent;
  adminToken: string;
  adminRefresh: string;
};

let shared: TestContext | null = null;
let refs = 0;

/**
 * Empties every table (the real migrated schema stays). Foreign keys are switched off
 * on one connection (a transaction keeps it) so the order of the tables does not matter.
 */
export async function clearDatabase(): Promise<void> {
  const rows = await prisma.$queryRaw<{ name: string }[]>`
    SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '_prisma_migrations'`;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const { name } of rows) await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${name}\``);
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  });
}

export async function setupTestApp(): Promise<TestContext> {
  refs += 1;
  if (shared) return shared;

  await clearDatabase();

  const { runSeed } = await import('../../src/scripts/seed');
  await runSeed({ minimalProducts: true });

  const { default: app } = await import('../../src/app');
  const agent = request(app);

  const login = await agent
    .post('/api/v1/auth/login')
    .send({ email: 'admin@shop-tools.local', password: 'Admin123!' })
    .expect(200);

  shared = {
    app,
    request: agent,
    adminToken: login.body.accessToken as string,
    adminRefresh: login.body.refreshToken as string,
  };
  return shared;
}

export async function teardownTestApp(): Promise<void> {
  refs = Math.max(0, refs - 1);
  if (refs > 0 || !shared) return;
  await disconnectPrisma();
  shared = null;
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export const shippingAddress = {
  fullName: 'Test User',
  line1: '1 Test St',
  city: 'Tehran',
  postalCode: '12345',
  country: 'IR',
};

export async function registerCustomer(
  agent: TestAgent,
  suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
): Promise<{ accessToken: string; refreshToken: string; email: string; userId: string }> {
  const email = `customer_${suffix}@test.local`;
  const res = await agent
    .post('/api/v1/auth/register')
    .send({ name: 'Customer', email, password: 'Customer123!' })
    .expect(201);
  return {
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    email,
    userId: res.body.user.id,
  };
}
