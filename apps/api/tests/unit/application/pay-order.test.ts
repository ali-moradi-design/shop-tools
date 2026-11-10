import { describe, expect, it, vi } from 'vitest';
import { PayOrderUseCase } from '../../../src/modules/ordering/application/use-cases/pay-order';
import { DomainError } from '../../../src/shared/domain/DomainError';
import type { Order } from '../../../src/modules/ordering/domain/order.entity';

function pendingOrder(): Order {
  return {
    id: 'o1',
    user: 'u1',
    items: [{ product: 'b1', sku: 'B1-10', label: 'Standard', title: 'T', price: 1000, quantity: 1 }],
    subtotalAmount: 1000,
    discountAmount: 0,
    totalAmount: 1000,
    status: 'pending_payment',
    payment: { method: 'fake', status: 'pending' },
    shippingAddress: {
      fullName: 'A',
      line1: '1',
      city: 'C',
      postalCode: '1',
      country: 'IR',
    },
    statusHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const receipt = { method: 'stripe' as const, transactionId: 'pi_1', note: 'Paid with Stripe' };

describe('PayOrderUseCase', () => {
  it('marks order paid and decrements stock', async () => {
    const order = pendingOrder();
    const orders = {
      findById: vi.fn().mockResolvedValue(order),
      save: vi.fn(async (o: Order) => o), claimStatus: vi.fn().mockResolvedValue(true),
      recordAllocations: vi.fn(),
    };
    const products = {
      decrementStock: vi.fn().mockResolvedValue([{ warehouse: 'BER', quantity: 1 }]),
      incrementStock: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: 'b1',
        title: 'T',
        stock: 10,
      }),
    };
    const uc = new PayOrderUseCase(orders as never, products as never);
    const paid = await uc.execute('o1', receipt);
    expect(paid.status).toBe('paid');
    expect(products.decrementStock).toHaveBeenCalledWith('b1', 'B1-10', 1);
    expect(orders.recordAllocations).toHaveBeenCalledWith('o1', [
      { product: 'b1', sku: 'B1-10', warehouse: 'BER', quantity: 1 },
    ]);
  });

  it('puts taken units back in the same warehouses when a later line fails (no unit of work)', async () => {
    const order = pendingOrder();
    order.items.push({ product: 'b2', sku: 'B2-1', label: 'Standard', title: 'T2', price: 500, quantity: 3 });
    const orders = { findById: vi.fn().mockResolvedValue(order), save: vi.fn(async (o: Order) => o), claimStatus: vi.fn().mockResolvedValue(true), recordAllocations: vi.fn() };
    const products = {
      decrementStock: vi
        .fn()
        .mockResolvedValueOnce([{ warehouse: 'BER', quantity: 1 }])
        .mockResolvedValueOnce(null),
      incrementStock: vi.fn(),
      findById: vi.fn(),
    };
    const uc = new PayOrderUseCase(orders as never, products as never);
    await expect(uc.execute('o1', receipt)).rejects.toThrow(/Insufficient stock/);
    expect(products.incrementStock).toHaveBeenCalledWith('b1', 'B1-10', 1, 'BER');
    expect(order.status).toBe('failed');
  });

  it('records the receipt and ignores a repeat of the same transaction', async () => {
    const order = pendingOrder();
    const orders = { findById: vi.fn().mockResolvedValue(order), save: vi.fn(async (o: Order) => o), claimStatus: vi.fn().mockResolvedValue(true), recordAllocations: vi.fn() };
    const products = { decrementStock: vi.fn().mockResolvedValue([{ warehouse: 'BER', quantity: 1 }]), incrementStock: vi.fn(), findById: vi.fn() };
    const uc = new PayOrderUseCase(orders as never, products as never);
    const paid = await uc.execute('o1', receipt);
    expect(paid.payment).toMatchObject({ method: 'stripe', status: 'paid', transactionId: 'pi_1' });
    expect(paid.statusHistory.at(-1)?.note).toBe('Paid with Stripe');
    await uc.execute('o1', receipt);
    expect(products.decrementStock).toHaveBeenCalledTimes(1);
    // a different payment for an order that is already paid is refused
    await expect(uc.execute('o1', { ...receipt, transactionId: 'pi_2' })).rejects.toBeInstanceOf(DomainError);
  });
});
