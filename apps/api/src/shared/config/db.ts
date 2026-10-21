import { prisma } from '../infra/prisma/client';

/** Opens the MySQL connection pool now, so a wrong DATABASE_URL fails at start-up. */
export async function connectDb(): Promise<void> {
  await prisma.$connect();
  console.log('MySQL connected');
}
