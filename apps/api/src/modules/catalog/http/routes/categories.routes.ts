import { Router } from 'express';
import { validate } from '@shared/http/middleware/validate';
import * as ctrl from '../controllers/categories.controller';
import { categorySlugParamSchema } from '../validators/products.validation';

export const categoriesRouter = Router();
categoriesRouter.get('/', ctrl.list);
categoriesRouter.get('/:slug', validate({ params: categorySlugParamSchema }), ctrl.get);

export const warehousesRouter = Router();
warehousesRouter.get('/', ctrl.warehouses);
