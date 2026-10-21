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

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  list(filter: { userId?: string; limit?: number }): Promise<Order[]>;
  create(input: CreateOrderInput): Promise<Order>;
  save(order: Order): Promise<Order>;
  updateStatus(
    id: string,
    status: OrderStatus,
    payment?: Partial<Payment>,
    note?: string,
  ): Promise<Order | null>;
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
