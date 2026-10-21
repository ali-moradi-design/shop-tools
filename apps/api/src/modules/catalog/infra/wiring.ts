import { PrismaProductRepository } from './ProductRepository';
import { ProductService } from '../application/product.service';

export const productRepo = new PrismaProductRepository();
export const productService = new ProductService(productRepo);
