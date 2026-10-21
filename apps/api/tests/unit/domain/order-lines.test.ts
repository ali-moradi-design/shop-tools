import { describe, expect, it } from 'vitest';
import { buildOrderLines } from '../../../src/modules/ordering/domain/rules/order.lines';
import { makeProduct } from '../../helpers/product';

describe('order lines', () => {
  const product = makeProduct();

  it('prices a line from the catalog and copies the chosen variant', () => {
    const [line] = buildOrderLines([product], [{ productId: 'p1', sku: 'DCD805E2T-GB', quantity: 2 }]);
    expect(line).toMatchObject({ product: 'p1', sku: 'DCD805E2T-GB', label: '2 × 1.7 Ah kit', price: 19900, quantity: 2 });
    expect(line.image).toBe(product.images[0]);
  });

  it('checks the stock of the chosen variant, not of the product', () => {
    expect(() =>
      buildOrderLines([product], [{ productId: 'p1', sku: 'DCD805E2T-GB-BODY', quantity: 1 }]),
    ).toThrow(/Insufficient stock/);
  });

  it('uses the variant price when it has one', () => {
    const withBodyPrice = makeProduct({
      variants: [
        { sku: 'KIT', label: 'Kit', stock: 3, stockByWarehouse: [] },
        { sku: 'BODY', label: 'Body only', price: 12000, stock: 3, stockByWarehouse: [] },
      ],
    });
    const [kit] = buildOrderLines([withBodyPrice], [{ productId: 'p1', sku: 'KIT', quantity: 1 }]);
    const [body] = buildOrderLines([withBodyPrice], [{ productId: 'p1', sku: 'BODY', quantity: 1 }]);
    expect(kit.price).toBe(19900);
    expect(body.price).toBe(12000);
  });

  it('rejects unknown products', () => {
    expect(() =>
      buildOrderLines([product], [{ productId: 'other', sku: 'DCD805E2T-GB', quantity: 1 }]),
    ).toThrow(/not found/);
  });
});
