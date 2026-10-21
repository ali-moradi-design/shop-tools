import type { Product } from '../../src/modules/catalog/domain/product.entity';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    slug: 'dcd805e2t-gb',
    title: '18V XR Brushless Hammer Drill Driver',
    brand: 'DEWALT',
    model: 'DCD805E2T-GB',
    category: 'drills',
    categoryName: 'Drills & drivers',
    description: 'x',
    features: [],
    price: 19900,
    currency: 'USD',
    images: ['/catalog/dcd805e2t-gb.webp'],
    variants: [
      {
        sku: 'DCD805E2T-GB',
        label: '2 × 1.7 Ah kit',
        stock: 5,
        stockByWarehouse: [{ warehouse: 'BER', quantity: 5 }],
      },
      { sku: 'DCD805E2T-GB-BODY', label: 'Body only', stock: 0, stockByWarehouse: [{ warehouse: 'BER', quantity: 0 }] },
    ],
    stock: 5,
    warehouses: [{ warehouse: 'BER', quantity: 5 }],
    specs: [],
    tags: [],
    featured: false,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
