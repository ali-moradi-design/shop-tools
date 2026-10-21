/**
 * Nightly demo reset: removes everything visitors created (orders, carts,
 * favorites, reviews, sign-ups, sessions) and restores the seed catalog,
 * stock, prices and demo reviews. Run with `pnpm reset-demo` (cron on the server).
 */
import mongoose from 'mongoose';
import { connectDb } from '../shared/config/db';
import { OrderModel } from '../modules/ordering/infra/models/OrderModel';
import { CartModel } from '../modules/ordering/infra/models/CartModel';
import { FavoriteModel } from '../modules/engagement/infra/models/FavoriteModel';
import { ReviewModel } from '../modules/reviews/infra/models/ReviewModel';
import { UserModel } from '../modules/identity/infra/models/UserModel';
import { RefreshTokenModel } from '../modules/identity/infra/models/RefreshTokenModel';
import { DiscountModel } from '../modules/promotions/infra/models/DiscountModel';
import { ProductModel } from '../modules/catalog/infra/models/ProductModel';
import { runSeed } from './seed';
import { adminCredentials } from './seed/identity';

/** Accounts created by the seed keep existing; every other account is a visitor's. */
const SEED_ACCOUNTS = /@shop-tools\.local$/;

export async function resetDemo(): Promise<void> {
  await Promise.all([
    OrderModel.deleteMany({}),
    CartModel.deleteMany({}),
    FavoriteModel.deleteMany({}),
    ReviewModel.deleteMany({}),
    RefreshTokenModel.deleteMany({}),
    UserModel.deleteMany({ $and: [{ email: { $not: SEED_ACCOUNTS } }, { email: { $ne: adminCredentials().email } }] }),
    DiscountModel.updateMany({}, { usedCount: 0 }),
    // prices, stock and ratings come back from the seed below
    ProductModel.updateMany({}, { ratingAvg: 0, ratingCount: 0 }),
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
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Demo reset failed:', err);
  process.exit(1);
});
