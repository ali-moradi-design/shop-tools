import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { Express } from 'express';

export type TestAgent = ReturnType<typeof request>;

export type TestContext = {
  app: Express;
  request: TestAgent;
  mongod: MongoMemoryServer | null;
  adminToken: string;
  adminRefresh: string;
};

/** Pinned version known to publish Windows + Linux binaries (avoids MMS default 8.x 403 on Windows). */
const MEMORY_MONGO_VERSION = process.env.MONGOMS_VERSION ?? '7.0.14';

let shared: TestContext | null = null;
let refs = 0;

async function startMongo(): Promise<{ uri: string; mongod: MongoMemoryServer | null }> {
  const externalUri = process.env.TEST_MONGODB_URI?.trim();
  if (externalUri) {
    return { uri: externalUri, mongod: null };
  }

  try {
    const mongod = await MongoMemoryServer.create({
      binary: { version: MEMORY_MONGO_VERSION },
    });
    return { uri: mongod.getUri(), mongod };
  } catch (err) {
    const fallback = 'mongodb://127.0.0.1:27017/shop-tools-test';
    console.warn(
      `[tests] MongoMemoryServer failed (binary ${MEMORY_MONGO_VERSION}). Falling back to ${fallback}.`,
      err instanceof Error ? err.message : err,
    );
    return { uri: fallback, mongod: null };
  }
}

export async function setupTestApp(): Promise<TestContext> {
  refs += 1;
  if (shared) return shared;

  const { uri, mongod } = await startMongo();
  process.env.MONGODB_URI = uri;

  // Reconnect if a previous suite left mongoose connected to a dead server
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  // Isolate external DB runs
  if (!mongod) {
    await mongoose.connection.dropDatabase();
  }

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
    mongod,
    adminToken: login.body.accessToken as string,
    adminRefresh: login.body.refreshToken as string,
  };
  return shared;
}

export async function teardownTestApp(): Promise<void> {
  refs = Math.max(0, refs - 1);
  if (refs > 0 || !shared) return;

  try {
    if (!shared.mongod) {
      await mongoose.connection.dropDatabase();
    }
  } catch {
    /* ignore */
  }
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  try {
    if (shared.mongod) await shared.mongod.stop();
  } catch {
    /* ignore */
  }
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
