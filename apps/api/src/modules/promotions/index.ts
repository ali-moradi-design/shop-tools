export { registerPromotionsRoutes } from './http/registerRoutes';
export { discountRepo, discountService } from './infra/wiring';
export { DiscountService } from './application/discount.service';
export type { Discount, CreateDiscountInput, UpdateDiscountInput } from './domain/discount.entity';
export type { IDiscountRepository } from './domain/discount.repository';
export { discountsPaths } from './http/docs/discounts.paths';
