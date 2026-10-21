import { Router } from 'express';
import { authenticate, requirePermission } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import * as ctrl from '../controllers/products.controller';
import {
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  slugParamSchema,
  listProductsQuerySchema,
  facetsQuerySchema,
  compareQuerySchema,
} from '../validators/products.validation';

const router = Router();

router.get('/featured', ctrl.listFeatured);
router.get('/facets', validate({ query: facetsQuerySchema }), ctrl.facets);
router.get('/compare', validate({ query: compareQuerySchema }), ctrl.compare);
router.get('/', validate({ query: listProductsQuerySchema }), ctrl.list);
router.get('/slug/:slug', validate({ params: slugParamSchema }), ctrl.getBySlug);
router.get('/:id', validate({ params: idParamSchema }), ctrl.getById);

router.post('/', authenticate, requirePermission('products:create'), validate({ body: createProductSchema }), ctrl.create);
router.patch('/:id', authenticate, requirePermission('products:update'), validate({ params: idParamSchema, body: updateProductSchema }), ctrl.update);
router.delete('/:id', authenticate, requirePermission('products:delete'), validate({ params: idParamSchema }), ctrl.remove);

export default router;
