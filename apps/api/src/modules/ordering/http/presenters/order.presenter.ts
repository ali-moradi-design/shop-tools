import type { Order } from '@modules/ordering/domain/order.entity';
import { toOrderDto } from '@modules/ordering/application/dto/order.mapper';

export function presentOrder(order: Order) {
  return toOrderDto(order);
}

export function presentOrders(orders: Order[]) {
  return orders.map(presentOrder);
}
