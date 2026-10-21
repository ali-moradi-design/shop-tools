import { PrismaCartRepository } from './CartRepository';
import { PrismaOrderRepository } from './OrderRepository';
import { CartService } from '../application/cart.service';
import { OrderService } from '../application/order.service';
import { productRepo } from '../../catalog';
import { discountService } from '../../promotions';
import { unitOfWork, notifier } from '../../../shared/infra';

export const cartRepo = new PrismaCartRepository();
export const orderRepo = new PrismaOrderRepository();

export const orderService = new OrderService(
  orderRepo,
  productRepo,
  discountService,
  unitOfWork,
  notifier,
);
export const cartService = new CartService(cartRepo, productRepo, orderRepo, discountService);
