import type { Product } from '../../src/modules/catalog/domain/product.entity';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    slug: 'mens-captain-tobacco',
    title: 'Captain | Tobacco',
    name: 'Captain',
    style: 'mens-captain',
    color: 'Tobacco',
    colorFamily: 'Brown',
    category: 'boots',
    gender: 'men',
    description: 'x',
    features: [],
    price: 19900,
    currency: 'USD',
    images: ['https://example.com/captain.jpg'],
    variants: [
      { sku: 'CAP-10', size: '10', stock: 5 },
      { sku: 'CAP-11', size: '11', stock: 0 },
    ],
    stock: 5,
    tags: [],
    featured: false,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
