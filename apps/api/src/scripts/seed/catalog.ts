import type { repos } from '../../shared/composition/repos';
import { CATEGORIES, WAREHOUSES } from './catalog/taxonomy';
import { generateCatalog, FEATURED_COUNT } from './catalog/generate';

type Repos = typeof repos;

export { FEATURED_COUNT };

/**
 * Warehouses, categories with their specification definitions, then the products.
 * `minimalProducts` (tests): three products per category, so every category is covered
 * but the run stays fast.
 */
export async function seedCatalog(repos: Repos, options: { minimalProducts?: boolean } = {}): Promise<void> {
  for (const w of WAREHOUSES) await repos.warehouses.upsert(w);
  for (const c of CATEGORIES) await repos.categories.upsert(c);

  let products = generateCatalog();
  if (options.minimalProducts) {
    const seen = new Map<string, number>();
    products = products.filter((p) => {
      const n = (seen.get(p.category) ?? 0) + 1;
      seen.set(p.category, n);
      return n <= 3;
    });
  }
  for (const p of products) {
    await repos.products.upsertBySlug(p.slug, { ...p, currency: 'USD' });
  }
}
