import { PrismaDiscountRepository } from './DiscountRepository';
import { DiscountService } from '../application/discount.service';

export const discountRepo = new PrismaDiscountRepository();
export const discountService = new DiscountService(discountRepo);
