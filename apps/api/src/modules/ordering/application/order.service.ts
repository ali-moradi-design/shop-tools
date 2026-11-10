import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import type { IProductRepository } from '@modules/catalog';
import type {
  Order,
  OrderStatus,
  ShippingAddress,
  Shipment,
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
import { paginate } from '@shared/pagination';
import { domainEvents, orderCancelledEvent, orderShippedEvent, stockRestoredEvent } from '@shared/domain/events';
import { buildOrderLines } from '@modules/ordering/domain/rules/order.lines';
import { computeSubtotal, computeOrderTotal } from '@modules/ordering/domain/rules/cart.totals';
import { PayOrderUseCase, type PaymentReceipt } from './use-cases/pay-order';
import type { Refunder } from './payments.port';

export class OrderService {
  private readonly payOrder: PayOrderUseCase;

  constructor(
    private readonly orders: IOrderRepository,
    private readonly products: IProductRepository,
    private readonly discounts?: DiscountService,
    uow?: IUnitOfWork,
    notifications?: INotificationPort,
    /** Refunds a Stripe payment when a paid order is cancelled. */
    private readonly refunds?: Refunder,
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

  /** Staff record a payment received outside Stripe (bank transfer, phone order). */
  recordPayment(orderId: string, staffId: string): Promise<Order> {
    return this.payOrder.execute(orderId, {
      method: 'manual',
      transactionId: `manual_${orderId}`,
      note: `Payment recorded by staff (${staffId.slice(-6)})`,
    });
  }

  /** The verified Stripe webhook confirms a payment. */
  confirmPayment(orderId: string, receipt: PaymentReceipt): Promise<Order> {
    return this.payOrder.execute(orderId, receipt);
  }

  /** Staff see every order; customers only their own. */
  async list(userId: string, canReadAll: boolean, query: { status?: OrderStatus; q?: string; page?: number; limit?: number } = {}) {
    const { page, limit } = paginate(query.page, query.limit ?? 50);
    const { data, total } = await this.orders.search({
      ...(canReadAll ? {} : { userId }),
      status: query.status,
      q: query.q,
      page,
      limit,
    });
    return { data, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getById(orderId: string, userId: string, canReadAll: boolean): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError('Order not found', 'NOT_FOUND');
    if (!canReadAll && order.user !== userId) {
      throw new DomainError('Forbidden', 'FORBIDDEN');
    }
    return order;
  }

  async updateStatus(
    orderId: string,
    nextStatus: OrderStatus,
    note?: string,
    shipment?: Pick<Shipment, 'carrier' | 'trackingNumber'>,
  ): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new DomainError('Order not found', 'NOT_FOUND');

    assertTransition(order.status, nextStatus);

    if (nextStatus === 'cancelled' && !canCancel(order.status)) {
      throw new DomainError('Cannot cancel order in current status', 'VALIDATION');
    }

    let refunded = false;
    if (nextStatus === 'cancelled' && shouldRestockOnCancel(order.status)) {
      // money first: if the refund fails nothing has changed and staff can retry
      if (order.payment.method === 'stripe' && order.payment.transactionId && this.refunds && !order.refundId) {
        order.refundId = await this.refunds.refund(order.payment.transactionId, order.totalAmount);
        refunded = true;
      }
    }
    // one request wins the transition; a second click or a parallel admin action stops here,
    // so stock is not put back twice (the refund above is idempotent at Stripe)
    if (!(await this.orders.claimStatus(order.id, order.status, nextStatus))) {
      throw new DomainError('This order was just changed by someone else. Reload and try again.', 'CONFLICT');
    }
    if (nextStatus === 'cancelled' && shouldRestockOnCancel(order.status)) {
      // units go back to the warehouses they were taken from; options that were sold out wake their alerts
      const soldOut = new Map<string, Set<string>>();
      for (const productId of new Set(order.items.map((i) => i.product))) {
        const p = await this.products.findById(productId);
        soldOut.set(productId, new Set(p?.variants.filter((v) => v.stock === 0).map((v) => v.sku) ?? []));
      }
      for (const item of order.items) {
        const from = item.allocations?.length ? item.allocations : [{ warehouse: undefined, quantity: item.quantity }];
        for (const a of from) await this.products.incrementStock(item.product, item.sku, a.quantity, a.warehouse);
      }
      for (const [productId, skus] of soldOut) {
        const back = order.items.filter((i) => i.product === productId && skus.has(i.sku)).map((i) => i.sku);
        if (back.length) await domainEvents.publish(stockRestoredEvent({ productId, skus: back }));
      }
    }
    if (nextStatus === 'shipped' && shipment) {
      order.shipment = { carrier: shipment.carrier, trackingNumber: shipment.trackingNumber.trim(), shippedAt: new Date() };
    }

    order.status = nextStatus;
    const autoNote = refunded ? `Refunded ${order.refundId}` : undefined;
    order.statusHistory.push({ status: nextStatus, at: new Date(), note: [note, autoNote].filter(Boolean).join(' · ') || undefined });
    const saved = await this.orders.save(order);
    if (nextStatus === 'shipped') await domainEvents.publish(orderShippedEvent({ orderId: saved.id, userId: saved.user }));
    if (nextStatus === 'cancelled') await domainEvents.publish(orderCancelledEvent({ orderId: saved.id, userId: saved.user, refunded }));
    return saved;
  }

  /** A customer cancels their own order before it ships (a paid one is refunded). */
  async cancelOwn(orderId: string, userId: string, reason?: string): Promise<Order> {
    const order = await this.getById(orderId, userId, false);
    if (!canCancel(order.status)) {
      throw new DomainError('This order has shipped and can no longer be cancelled. You can request a return instead.', 'VALIDATION');
    }
    return this.updateStatus(order.id, 'cancelled', reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer');
  }
}
