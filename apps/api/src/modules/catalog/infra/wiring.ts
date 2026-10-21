import { MongooseProductRepository } from './ProductRepository';
import { ProductService } from '../application/product.service';

export const productRepo = new MongooseProductRepository();
export const productService = new ProductService(productRepo);
