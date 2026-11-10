import type { Order, CreateOrderInput, OrderStatus, Payment } from './order.entity';

/**
 * Which orders the reports look at: always paid, never deleted; optionally only some
 * statuses and a paid-at window.
 */
export interface OrderStatsFilter {
  statuses?: OrderStatus[];
  paidFrom?: Date;
  paidTo?: Date;
}

/** One page of orders; `q` matches the end of the order id, the ship-to name or the customer's e-mail. */
export interface OrderSearchFilter {
  userId?: string;
  status?: OrderStatus;
  q?: string;
  page: number;
  limit: number;
}

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByCheckoutSession(sessionId: string): Promise<Order | null>;
  list(filter: { userId?: string; limit?: number }): Promise<Order[]>;
  search(filter: OrderSearchFilter): Promise<{ data: Order[]; total: number }>;
  create(input: CreateOrderInput): Promise<Order>;
  save(order: Order): Promise<Order>;
  /**
   * Moves the order from `from` to `to` only if it is still in `from` (one atomic write).
   * False means another request changed it first; callers must not repeat side effects then.
   */
  claimStatus(id: string, from: OrderStatus, to: OrderStatus): Promise<boolean>;
  updateStatus(
    id: string,
    status: OrderStatus,
    payment?: Partial<Payment>,
    note?: string,
  ): Promise<Order | null>;
  /** Records which warehouse each paid unit came from (one entry per product, sku and warehouse). */
  recordAllocations(
    orderId: string,
    allocations: { product: string; sku: string; warehouse: string; quantity: number }[],
  ): Promise<void>;
  count(): Promise<number>;
  aggregateRevenue(filter: OrderStatsFilter): Promise<{
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
  }>;
  aggregateByStatus(): Promise<{ status: string; count: number }[]>;
  aggregateTopProducts(
    filter: OrderStatsFilter,
    limit: number,
  ): Promise<{ _id: string; title: string; quantitySold: number; revenue: number }[]>;
  aggregateSalesByDate(
    filter: OrderStatsFilter,
  ): Promise<{ date: string; revenue: number; orders: number }[]>;
}
