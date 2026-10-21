import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
} from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import * as ctrl from '../controllers/cart.controller';
import { resolveCartOwner } from '../middleware/cartOwner';
import {
  addCartItemSchema,
  updateCartItemSchema,
  lineParamSchema,
  checkoutSchema,
  quoteSchema,
} from '../validators/cart.validation';

const router = Router();

// Signed-in or guest cart.
const owner = [optionalAuthenticate, resolveCartOwner];

router.get('/', owner, ctrl.get);
router.post('/items', owner, validate({ body: addCartItemSchema }), ctrl.addItem);
router.patch(
  '/items/:productId/:sku',
  owner,
  validate({ params: lineParamSchema, body: updateCartItemSchema }),
  ctrl.updateItem,
);
router.delete('/items/:productId/:sku', owner, validate({ params: lineParamSchema }), ctrl.removeItem);
router.delete('/', owner, ctrl.clear);
router.post('/quote', owner, validate({ body: quoteSchema }), ctrl.quote);

// Signed-in only.
router.post('/merge', authenticate, ctrl.merge);
router.post(
  '/checkout',
  authenticate,
  requirePermission('orders:create'),
  validate({ body: checkoutSchema }),
  ctrl.checkout,
);

export default router;
