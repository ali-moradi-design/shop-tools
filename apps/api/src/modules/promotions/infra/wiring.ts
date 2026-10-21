import { MongooseDiscountRepository } from './DiscountRepository';
import { DiscountService } from '../application/discount.service';

export const discountRepo = new MongooseDiscountRepository();
export const discountService = new DiscountService(discountRepo);
