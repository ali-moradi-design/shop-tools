import { describe, expect, it } from 'vitest';
import { buildOrderLines } from '../../../src/modules/ordering/domain/rules/order.lines';
import { makeProduct } from '../../helpers/product';

describe('order lines', () => {
  const product = makeProduct();

  it('prices a line from the catalog and copies the chosen size', () => {
    const [line] = buildOrderLines([product], [{ productId: 'p1', sku: 'CAP-10', quantity: 2 }]);
    expect(line).toMatchObject({ product: 'p1', sku: 'CAP-10', size: '10', price: 19900, quantity: 2 });
    expect(line.image).toBe(product.images[0]);
  });

  it('checks the stock of the chosen size, not of the product', () => {
    expect(() =>
      buildOrderLines([product], [{ productId: 'p1', sku: 'CAP-11', quantity: 1 }]),
    ).toThrow(/Insufficient stock/);
  });

  it('rejects unknown products', () => {
    expect(() =>
      buildOrderLines([product], [{ productId: 'other', sku: 'CAP-10', quantity: 1 }]),
    ).toThrow(/not found/);
  });
});
