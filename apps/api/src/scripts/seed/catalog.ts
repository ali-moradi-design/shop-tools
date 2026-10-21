import type { repos } from '../../shared/composition/repos';
import type { CreateProductInput } from '../../modules/catalog';
import products from './data/products.json';

type Repos = typeof repos;

/** How many products (in catalog order) are marked as featured on the home page. */
export const FEATURED_COUNT = 16;

export const SEED_PRODUCTS = products as CreateProductInput[];

export async function seedCatalog(
  repos: Repos,
  options: { minimalProducts?: boolean } = {},
): Promise<void> {
  const productsToSeed = options.minimalProducts ? SEED_PRODUCTS.slice(0, 6) : SEED_PRODUCTS;
  for (const [i, p] of productsToSeed.entries()) {
    await repos.products.upsertBySlug(p.slug, {
      ...p,
      currency: 'USD',
      featured: i < FEATURED_COUNT,
      featuredOrder: i,
    });
  }
}
