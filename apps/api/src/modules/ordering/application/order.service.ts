import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import type { IProductRepository } from '@modules/catalog';
import type {
  Order,
  OrderStatus,
  ShippingAddress,
} from '@modules/ordering/domain/order.entity';
import type { DiscountService } from '@modules/promotions';
import type { IUnitOfWork } from '@shared/application/unit-of-work.port';
import type { INotificationPort } from '@shared/domain/notifications.port';
import {
  assertTransition,
  canCancel,
  shouldRestockOnCancel,
} from '@modules/ordering/domain/order.transitions';
import { DomainError } from '@shared/domain/DomainError';
import { buildOrderLines } from '@modules/ordering/domain/rules/order.lines';
import { computeSubtotal, computeOrderTotal } from '@modules/ordering/domain/rules/cart.totals';
import { PayOrderUseCase } from './use-cases/pay-order';

export class OrderService {
  private readonly payOrder: PayOrderUseCase;

  constructor(
    private readonly orders: IOrderRepository,
    private readonly products: IProductRepository,
    private readonly discounts?: DiscountService,
    uow?: IUnitOfWork,
    notifications?: INotificationPort,
  ) {
    this.payOrder = new PayOrderUseCase(orders, products, uow, notifications);
  }

  async create(
    userId: string,
    items: { product: string; sku: string; quantity: number }[],
    shippingAddress: ShippingAddress,
    discountCode?: string,
  ): Promise<Order> {
    const productIds = [...new Set(items.map((i) => i.product))];
    const products = await this.products.findByIds(productIds);
    if (products.length !== productIds.length) {
      throw new DomainError('One or more products not found', 'NOT_FOUND');
    }
    const orderItems = buildOrderLines(
      products,
      items.map((i) => ({ productId: i.product, sku: i.sku, quantity: i.quantity })),
    );

    const subtotalAmount = computeSubtotal(
      orderItems.map((i) => ({
        productId: i.product,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
      })),
    );

    let discountAmount = 0;
    let appliedCode: string | undefined;
    let discountId: string | undefined;

    if (this.discounts) {
      const result = await this.discounts.computeDiscount(discountCode, subtotalAmount);
      discountAmount = result.discountAmount;
      appliedCode = result.discount?.code;
      discountId = result.discount?.id;
    } else if (discountCode) {
      throw new DomainError('Discount codes are not available', 'INVALID_DISCOUNT');
    }

    const totalAmount = computeOrderTotal(subtotalAmount, discountAmount);

    const order = await this.orders.create({
      userId,
      items: orderItems,
      subtotalAmount,
      discountCode: appliedCode,
      discountAmount,
      totalAmount,
      shippingAddress,
    });

    if (discountId && this.discounts) {
      await this.discounts.recordUse(discountId);
    }

    return order;
  }

  pay(orderId: string, userId: string, isStaff: boolean): Promise<Order> {
    return this.payOrder.execute(orderId, userId, isStaff);
  }

  async list(userId: string, canReadAll: boolean): Promise<Order[]> {
    return this.orders.list(canReadAll ? {} : { userId });
  }

  async getById(orderId: string, userId: string, canReadAll: boolean): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError('Order not found', 'NOT_FOUND');
    if (!canReadAll && order.user !== userId) {
      throw new DomainError('Forbidden', 'FORBIDDEN');
    }
    return order;
  }

  async updateStatus(orderId: string, nextStatus: OrderStatus, note?: string): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError('Order not found', 'NOT_FOUND');

    assertTransition(order.status, nextStatus);

    if (nextStatus === 'cancelled' && !canCancel(order.status)) {
      throw new DomainError('Cannot cancel order in current status', 'VALIDATION');
    }

    if (nextStatus === 'cancelled' && shouldRestockOnCancel(order.status)) {
      for (const item of order.items) {
        await this.products.incrementStock(item.product, item.sku, item.quantity);
      }
    }

    order.status = nextStatus;
    order.statusHistory.push({ status: nextStatus, at: new Date(), note });
    return this.orders.save(order);
  }
}
