import { Prisma, type OrderStatus as DbOrderStatus } from '@prisma/client';
import type { IOrderRepository, OrderStatsFilter } from '@modules/ordering/domain/order.repository';
import type {
  Order,
  CreateOrderInput,
  OrderStatus,
  Payment,
} from '@modules/ordering/domain/order.entity';
import { getPrisma, prisma, type PrismaTx } from '@shared/infra/prisma/client';
import { mapOrder } from './mappers';

const include = { items: true, history: true } as const;

function inTransaction<T>(fn: (tx: PrismaTx) => Promise<T>): Promise<T> {
  const client = getPrisma();
  return client === prisma ? prisma.$transaction((tx) => fn(tx)) : fn(client);
}

/** Paid, not deleted, optionally limited by status and paid-at window. */
function statsWhere(filter: OrderStatsFilter): Prisma.OrderWhereInput {
  return {
    deletedAt: null,
    paymentStatus: 'paid',
    ...(filter.statuses ? { status: { in: filter.statuses as DbOrderStatus[] } } : {}),
    ...(filter.paidFrom || filter.paidTo
      ? { paidAt: { ...(filter.paidFrom ? { gte: filter.paidFrom } : {}), ...(filter.paidTo ? { lte: filter.paidTo } : {}) } }
      : {}),
  };
}

/** The same filter as raw SQL fragments (for the reports Prisma cannot group by itself). */
function statsSql(filter: OrderStatsFilter): Prisma.Sql {
  return Prisma.sql`o.deletedAt IS NULL AND o.paymentStatus = 'paid'
    ${filter.statuses?.length ? Prisma.sql`AND o.status IN (${Prisma.join(filter.statuses)})` : Prisma.empty}
    ${filter.paidFrom ? Prisma.sql`AND o.paidAt >= ${filter.paidFrom}` : Prisma.empty}
    ${filter.paidTo ? Prisma.sql`AND o.paidAt <= ${filter.paidTo}` : Prisma.empty}`;
}

export class PrismaOrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> {
    const row = await getPrisma().order.findFirst({ where: { id, deletedAt: null }, include });
    return row ? mapOrder(row) : null;
  }

  async list(filter: { userId?: string; limit?: number }): Promise<Order[]> {
    const rows = await getPrisma().order.findMany({
      where: { deletedAt: null, ...(filter.userId ? { userId: filter.userId } : {}) },
      orderBy: { createdAt: 'desc' },
      ...(filter.limit ? { take: filter.limit } : {}),
      include,
    });
    return rows.map(mapOrder);
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const a = input.shippingAddress;
    const row = await getPrisma().order.create({
      data: {
        userId: input.userId,
        subtotalAmount: input.subtotalAmount,
        discountCode: input.discountCode,
        discountAmount: input.discountAmount ?? 0,
        totalAmount: input.totalAmount,
        status: 'pending_payment',
        paymentMethod: 'fake',
        paymentStatus: 'pending',
        shippingFullName: a.fullName,
        shippingLine1: a.line1,
        shippingLine2: a.line2,
        shippingCity: a.city,
        shippingState: a.state,
        shippingPostalCode: a.postalCode,
        shippingCountry: a.country,
        items: {
          create: input.items.map((i, position) => ({
            productId: i.product,
            sku: i.sku,
            size: i.size,
            width: i.width,
            title: i.title,
            image: i.image,
            price: i.price,
            quantity: i.quantity,
            position,
          })),
        },
        history: { create: [{ status: 'pending_payment', note: 'Order created' }] },
      },
      include,
    });
    return mapOrder(row);
  }

  /** Writes status, payment, totals and the whole status history of the order. */
  async save(order: Order): Promise<Order> {
    return inTransaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id: order.id }, select: { id: true } });
      if (!existing) throw new Error('Order not found');
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: order.status,
          paymentStatus: order.payment.status,
          paidAt: order.payment.paidAt ?? null,
          transactionId: order.payment.transactionId ?? null,
          subtotalAmount: order.subtotalAmount,
          discountCode: order.discountCode ?? null,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
        },
      });
      await tx.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
      await tx.orderStatusHistory.createMany({
        data: order.statusHistory.map((h) => ({
          orderId: order.id,
          status: h.status,
          at: h.at,
          note: h.note ?? null,
        })),
      });
      return mapOrder(await tx.order.findUniqueOrThrow({ where: { id: order.id }, include }));
    });
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    payment?: Partial<Payment>,
    note?: string,
  ): Promise<Order | null> {
    return inTransaction(async (tx) => {
      const existing = await tx.order.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
      if (!existing) return null;
      await tx.order.update({
        where: { id },
        data: {
          status,
          ...(payment?.status ? { paymentStatus: payment.status } : {}),
          ...(payment?.paidAt ? { paidAt: payment.paidAt } : {}),
          ...(payment?.transactionId ? { transactionId: payment.transactionId } : {}),
          history: { create: { status, note } },
        },
      });
      return mapOrder(await tx.order.findUniqueOrThrow({ where: { id }, include }));
    });
  }

  async count(): Promise<number> {
    return getPrisma().order.count({ where: { deletedAt: null } });
  }

  async aggregateRevenue(filter: OrderStatsFilter) {
    const agg = await getPrisma().order.aggregate({
      where: statsWhere(filter),
      _sum: { totalAmount: true },
      _count: { _all: true },
      _avg: { totalAmount: true },
    });
    return {
      totalRevenue: agg._sum.totalAmount ?? 0,
      orderCount: agg._count._all,
      avgOrderValue: agg._avg.totalAmount ?? 0,
    };
  }

  async aggregateByStatus() {
    const rows = await getPrisma().order.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  }

  async aggregateTopProducts(filter: OrderStatsFilter, limit: number) {
    const rows = await getPrisma().$queryRaw<
      { id: string; title: string; quantitySold: bigint; revenue: bigint }[]
    >`SELECT oi.productId AS id, MAX(oi.title) AS title,
        CAST(SUM(oi.quantity) AS SIGNED) AS quantitySold,
        CAST(SUM(oi.price * oi.quantity) AS SIGNED) AS revenue
      FROM OrderItem oi JOIN \`Order\` o ON o.id = oi.orderId
      WHERE ${statsSql(filter)}
      GROUP BY oi.productId
      ORDER BY quantitySold DESC, id ASC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      _id: r.id,
      title: r.title,
      quantitySold: Number(r.quantitySold),
      revenue: Number(r.revenue),
    }));
  }

  async aggregateSalesByDate(filter: OrderStatsFilter) {
    const rows = await getPrisma().$queryRaw<{ date: string; revenue: bigint; orders: bigint }[]>`
      SELECT DATE_FORMAT(o.paidAt, '%Y-%m-%d') AS date,
        CAST(SUM(o.totalAmount) AS SIGNED) AS revenue, COUNT(*) AS orders
      FROM \`Order\` o
      WHERE ${statsSql(filter)} AND o.paidAt IS NOT NULL
      GROUP BY date
      ORDER BY date ASC`;
    return rows.map((r) => ({ date: r.date, revenue: Number(r.revenue), orders: Number(r.orders) }));
  }
}
