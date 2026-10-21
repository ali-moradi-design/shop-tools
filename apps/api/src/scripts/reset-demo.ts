/**
 * Nightly demo reset: removes everything visitors created (orders, carts,
 * favorites, reviews, sign-ups, sessions) and restores the seed catalog,
 * stock, prices and demo reviews. Run with `pnpm reset-demo` (cron on the server).
 */
import { connectDb } from '../shared/config/db';
import { prisma, disconnectPrisma } from '../shared/infra/prisma/client';
import { runSeed } from './seed';
import { adminCredentials } from './seed/identity';

/** Accounts created by the seed keep existing; every other account is a visitor's. */
const SEED_ACCOUNT_DOMAIN = '@shop-tools.local';

export async function resetDemo(): Promise<void> {
  // one transaction: either everything a visitor created is gone, or nothing changed
  await prisma.$transaction([
    prisma.order.deleteMany(), // lines and status history go with the order
    prisma.cart.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.review.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany({
      where: {
        AND: [{ NOT: { email: { endsWith: SEED_ACCOUNT_DOMAIN } } }, { email: { not: adminCredentials().email } }],
      },
    }),
    prisma.discount.updateMany({ data: { usedCount: 0 } }),
    // prices, stock and ratings come back from the seed below
    prisma.product.updateMany({ data: { ratingAvg: 0, ratingCount: 0 } }),
  ]);
  await runSeed();
  await revalidateWeb();
}

/** Tells the storefront to drop its cached catalog (WEB_REVALIDATE_URL + REVALIDATE_SECRET). */
async function revalidateWeb(): Promise<void> {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
  if (!res.ok) console.warn(`Storefront revalidation failed: ${res.status}`);
}

async function main() {
  await connectDb();
  await resetDemo();
  console.log(`Demo data reset at ${new Date().toISOString()}`);
  await disconnectPrisma();
}

main().catch((err) => {
  console.error('Demo reset failed:', err);
  process.exit(1);
});
