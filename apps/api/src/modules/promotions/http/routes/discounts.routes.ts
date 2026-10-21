import { Router } from 'express';
import { authenticate, requirePermission } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import * as ctrl from '../controllers/discounts.controller';
import {
  createDiscountSchema,
  updateDiscountSchema,
  idParamSchema,
} from '../validators/discounts.validation';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('discounts:read'), ctrl.list);
router.get('/:id', requirePermission('discounts:read'), validate({ params: idParamSchema }), ctrl.getById);
router.post(
  '/',
  requirePermission('discounts:create'),
  validate({ body: createDiscountSchema }),
  ctrl.create,
);
router.patch(
  '/:id',
  requirePermission('discounts:update'),
  validate({ params: idParamSchema, body: updateDiscountSchema }),
  ctrl.update,
);
router.delete(
  '/:id',
  requirePermission('discounts:delete'),
  validate({ params: idParamSchema }),
  ctrl.remove,
);

export default router;
