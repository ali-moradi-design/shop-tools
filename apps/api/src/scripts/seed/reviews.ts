import type { repos } from '../../shared/composition/repos';
import { randomBytes } from 'node:crypto';
import { passwordHasher } from '../../modules/identity';
import { FEATURED_COUNT } from './catalog';

type Repos = typeof repos;

const REVIEWERS = ['Daniel R.', 'Sara K.', 'Marcus T.', 'Lena M.', 'Omid A.', 'Julia W.'];

const COMMENTS: [number, string][] = [
  [5, 'Plenty of power for the size. Drives long screws into hardwood without bogging down.'],
  [5, 'Solid build and the battery lasts a full day of light work. Would buy again.'],
  [4, 'Great tool for the price. A little heavy after an hour overhead, but nothing to complain about.'],
  [5, 'Does exactly what the spec sheet says. Delivered from the Berlin warehouse the next day.'],
  [4, 'Well made and easy to use. The case could be a bit smaller.'],
];

/** Demo reviews for the featured products (only when there are no reviews yet). */
export async function seedReviews(repos: Repos): Promise<void> {
  const { total } = await repos.reviews.list({ page: 1, limit: 1 });
  if (total > 0) return;

  const customerRole = (await repos.roles.list()).find((r) => r.name === 'customer');
  // nobody signs in as a reviewer: a random password keeps these accounts closed
  const passwordHash = await passwordHasher.hash(randomBytes(24).toString('base64url'));
  const users = [];
  for (const [i, name] of REVIEWERS.entries()) {
    const email = `reviewer${i + 1}@shop-tools.local`;
    users.push(
      (await repos.users.findByEmail(email)) ??
        (await repos.users.create({ name, email, passwordHash, roles: customerRole ? [customerRole.id] : [], isActive: true })),
    );
  }

  const { data: products } = await repos.products.list({ featured: true, page: 1, limit: FEATURED_COUNT });
  for (const [pi, product] of products.entries()) {
    const count = 2 + (pi % 3);
    for (let k = 0; k < count; k++) {
      const [rating, comment] = COMMENTS[(pi + k) % COMMENTS.length];
      await repos.reviews.create({ product: product.id, user: users[(pi + k) % users.length].id, rating, comment });
    }
    const { avg, count: n } = await repos.reviews.ratingSummary(product.id);
    await repos.products.setRating(product.id, avg, n);
  }
}
