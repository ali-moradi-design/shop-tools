import { PrismaProductRepository } from './ProductRepository';
import { PrismaCategoryRepository, PrismaWarehouseRepository } from './CategoryRepository';
import { ProductService } from '../application/product.service';
import { CategoryService } from '../application/category.service';

export const productRepo = new PrismaProductRepository();
export const categoryRepo = new PrismaCategoryRepository();
export const warehouseRepo = new PrismaWarehouseRepository();
export const productService = new ProductService(productRepo, categoryRepo, warehouseRepo);
export const categoryService = new CategoryService(categoryRepo, warehouseRepo);
