import { MongooseCartRepository } from './CartRepository';
import { MongooseOrderRepository } from './OrderRepository';
import { CartService } from '../application/cart.service';
import { OrderService } from '../application/order.service';
import { productRepo } from '../../catalog';
import { discountService } from '../../promotions';
import { unitOfWork, notifier } from '../../../shared/infra';

export const cartRepo = new MongooseCartRepository();
export const orderRepo = new MongooseOrderRepository();

export const orderService = new OrderService(
  orderRepo,
  productRepo,
  discountService,
  unitOfWork,
  notifier,
);
export const cartService = new CartService(cartRepo, productRepo, orderRepo, discountService);
