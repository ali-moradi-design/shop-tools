export { registerOrderingRoutes } from './http/registerRoutes';
export { cartRepo, orderRepo, cartService, orderService } from './infra/wiring';
export type { Order, OrderStatus, ShippingAddress } from './domain/order.entity';
export type { IOrderRepository } from './domain/order.repository';
export type { Cart } from './domain/cart.entity';
export type { ICartRepository } from './domain/cart.repository';
export { cartPaths } from './http/docs/cart.paths';
export { ordersPaths } from './http/docs/orders.paths';
