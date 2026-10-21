import type { repos } from '../../shared/composition/repos';

type Repos = typeof repos;

export async function seedPromotions(repos: Repos): Promise<void> {
  // Amounts in cents.
  const sampleDiscounts = [
    {
      code: 'WELCOME10',
      type: 'percent' as const,
      value: 10,
      minOrderAmount: 5000,
      maxUses: 1000,
      isActive: true,
    },
    {
      code: 'FLAT20',
      type: 'fixed' as const,
      value: 2000,
      minOrderAmount: 15000,
      maxUses: 500,
      isActive: true,
    },
  ];
  for (const d of sampleDiscounts) {
    const existing = await repos.discounts.findByCode(d.code);
    if (!existing) {
      await repos.discounts.create(d);
    }
  }
}
