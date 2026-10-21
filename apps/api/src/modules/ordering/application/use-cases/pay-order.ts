import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import type { IProductRepository } from '@modules/catalog';
import type { INotificationPort } from '@shared/domain/notifications.port';
import type { IUnitOfWork } from '@shared/application/unit-of-work.port';
import type { Order } from '@modules/ordering/domain/order.entity';
import { DomainError } from '@shared/domain/DomainError';
import { assertTransition } from '@modules/ordering/domain/order.transitions';
import { isStockLow, DEFAULT_LOW_STOCK_THRESHOLD } from '@modules/catalog';
import {
  domainEvents,
  orderPaidEvent,
  stockLowEvent,
} from '@shared/domain/events';

export class PayOrderUseCase {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly products: IProductRepository,
    private readonly uow?: IUnitOfWork,
    private readonly notifications?: INotificationPort,
    private readonly lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
  ) {}

  async execute(orderId: string, userId: string, isStaff: boolean): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError('Order not found', 'NOT_FOUND');
    if (!isStaff && order.user !== userId) {
      throw new DomainError('Forbidden', 'FORBIDDEN');
    }
    if (order.status !== 'pending_payment') {
      throw new DomainError('Order is not awaiting payment', 'VALIDATION');
    }

    assertTransition(order.status, 'paid');

    const decremented: { productId: string; sku: string; quantity: number }[] = [];
    const run = this.uow
      ? <T>(fn: () => Promise<T>) => this.uow!.runInTransaction(async () => fn())
      : <T>(fn: () => Promise<T>) => fn();

    try {
      await run(async () => {
        for (const item of order.items) {
          const ok = await this.products.decrementStock(item.product, item.sku, item.quantity);
          if (!ok) {
            throw new DomainError(
              `Insufficient stock for product ${item.title}`,
              'INSUFFICIENT_STOCK',
            );
          }
          decremented.push({ productId: item.product, sku: item.sku, quantity: item.quantity });
        }
      });

      order.status = 'paid';
      order.payment = {
        method: 'fake',
        status: 'paid',
        paidAt: new Date(),
        transactionId: `fake_${Date.now()}`,
      };
      order.statusHistory.push({
        status: 'paid',
        at: new Date(),
        note: 'Fake payment confirmed',
      });
      const saved = await this.orders.save(order);

      await domainEvents.publish(
        orderPaidEvent({
          orderId: saved.id,
          userId: saved.user,
          totalAmount: saved.totalAmount,
        }),
      );

      if (this.notifications) {
        await this.notifications.send({
          subject: `Order ${saved.id} paid`,
          body: `Payment confirmed for order ${saved.id} (total ${saved.totalAmount})`,
          meta: { orderId: saved.id, userId: saved.user },
        });
      }

      for (const item of saved.items) {
        const product = await this.products.findById(item.product);
        if (product && isStockLow(product.stock, this.lowStockThreshold)) {
          await domainEvents.publish(
            stockLowEvent({
              productId: product.id,
              title: product.title,
              stock: product.stock,
              threshold: this.lowStockThreshold,
            }),
          );
        }
      }

      return saved;
    } catch (err) {
      for (const d of decremented) {
        await this.products.incrementStock(d.productId, d.sku, d.quantity);
      }

      if (err instanceof DomainError && err.code === 'INSUFFICIENT_STOCK') {
        order.status = 'failed';
        order.payment.status = 'failed';
        order.statusHistory.push({
          status: 'failed',
          at: new Date(),
          note: err.message,
        });
        await this.orders.save(order);
      }
      throw err;
    }
  }
}
