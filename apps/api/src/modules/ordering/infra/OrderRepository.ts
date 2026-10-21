import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import type {
  Order,
  CreateOrderInput,
  OrderStatus,
  Payment,
} from '@modules/ordering/domain/order.entity';
import { OrderModel } from './models/OrderModel';
import { mapOrder } from './mappers';

export class MongooseOrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> {
    const doc = await OrderModel.findById(id);
    return doc ? mapOrder(doc) : null;
  }

  async list(filter: { userId?: string; limit?: number }): Promise<Order[]> {
    const q: Record<string, unknown> = {};
    if (filter.userId) q.user = filter.userId;
    let query = OrderModel.find(q).sort({ createdAt: -1 });
    if (filter.limit) query = query.limit(filter.limit);
    const docs = await query;
    return docs.map(mapOrder);
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const discountAmount = input.discountAmount ?? 0;
    const subtotalAmount = input.subtotalAmount;
    const doc = await OrderModel.create({
      user: input.userId,
      items: input.items.map((i) => ({
        product: i.product,
        sku: i.sku,
        size: i.size,
        width: i.width,
        title: i.title,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
      })),
      subtotalAmount,
      discountCode: input.discountCode,
      discountAmount,
      totalAmount: input.totalAmount,
      status: 'pending_payment',
      payment: { method: 'fake', status: 'pending' },
      shippingAddress: input.shippingAddress,
      statusHistory: [{ status: 'pending_payment', at: new Date(), note: 'Order created' }],
    });
    return mapOrder(doc);
  }

  async save(order: Order): Promise<Order> {
    const doc = await OrderModel.findById(order.id);
    if (!doc) throw new Error('Order not found');
    doc.status = order.status;
    doc.payment = order.payment;
    doc.statusHistory = order.statusHistory;
    doc.subtotalAmount = order.subtotalAmount;
    doc.discountCode = order.discountCode;
    doc.discountAmount = order.discountAmount;
    doc.totalAmount = order.totalAmount;
    await doc.save();
    return mapOrder(doc);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    payment?: Partial<Payment>,
    note?: string,
  ): Promise<Order | null> {
    const doc = await OrderModel.findById(id);
    if (!doc) return null;
    doc.status = status;
    if (payment) {
      doc.payment = { ...doc.payment, ...payment };
    }
    doc.statusHistory.push({ status, at: new Date(), note });
    await doc.save();
    return mapOrder(doc);
  }

  async count(): Promise<number> {
    return OrderModel.countDocuments();
  }

  async aggregateRevenue(match: Record<string, unknown>) {
    const [agg] = await OrderModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]);
    return agg ?? { totalRevenue: 0, orderCount: 0, avgOrderValue: 0 };
  }

  async aggregateByStatus() {
    return OrderModel.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);
  }

  async aggregateTopProducts(match: Record<string, unknown>, limit: number) {
    return OrderModel.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          title: { $first: '$items.title' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: limit },
    ]);
  }

  async aggregateSalesByDate(match: Record<string, unknown>) {
    return OrderModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment.paidAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', revenue: 1, orders: 1, _id: 0 } },
    ]);
  }
}
