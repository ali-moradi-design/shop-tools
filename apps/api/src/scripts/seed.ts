import { connectDb } from '../shared/config/db';
import { repos } from '../shared/composition/repos';
import { seedIdentity, adminCredentials } from './seed/identity';
import { seedCatalog, FEATURED_COUNT } from './seed/catalog';
import { seedPromotions } from './seed/promotions';
import { seedReviews } from './seed/reviews';

export type SeedOptions = {
  /** When true, seed only a handful of products (for automated tests). */
  minimalProducts?: boolean;
};

export async function runSeed(options: SeedOptions = {}): Promise<void> {
  await seedIdentity(repos);
  await seedCatalog(repos, options);
  await seedPromotions(repos);
  if (!options.minimalProducts) await seedReviews(repos);
}

async function main() {
  await connectDb();
  console.log('Seeding...');
  await runSeed();
  const productCount = await repos.products.count();
  console.log(`Products upserted (catalog count: ${productCount}); featured: ${FEATURED_COUNT}`);
  console.log(`Admin user: ${adminCredentials().email}${process.env.ADMIN_PASSWORD ? '' : ' / Admin123! (development default)'}`);
  console.log('Demo customer: demo@shop-tools.local / Demo123!');
  console.log('Sample discounts: WELCOME10 (10%), FLAT20 ($20 off $150+)');
  console.log('Seed complete.');
  process.exit(0);
}

const isCli =
  typeof process.argv[1] === 'string' &&
  (process.argv[1].endsWith('scripts/seed.ts') || process.argv[1].endsWith('scripts/seed.js'));

if (isCli) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
