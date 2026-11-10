import { Router } from 'express';
import { authenticate, requirePermission, requireAnyPermission } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import * as ctrl from '../controllers/orders.controller';
import { startCheckout } from '../controllers/payments.controller';
import { createOrderSchema, updateStatusSchema, idParamSchema, listOrdersQuerySchema } from '../validators/orders.validation';

const router = Router();
router.use(authenticate);

router.post('/', requirePermission('orders:create'), validate({ body: createOrderSchema }), ctrl.create);
router.get('/', requireAnyPermission('orders:read', 'orders:read-own'), validate({ query: listOrdersQuerySchema }), ctrl.listMine);
router.get('/:id', requireAnyPermission('orders:read', 'orders:read-own'), validate({ params: idParamSchema }), ctrl.getById);
router.post('/:id/checkout', requirePermission('orders:create'), validate({ params: idParamSchema }), startCheckout);
// staff only: customers pay through Stripe, and only Stripe's webhook marks those orders paid
router.post('/:id/pay', requirePermission('orders:update-status'), validate({ params: idParamSchema }), ctrl.pay);
router.patch(
  '/:id/status',
  requirePermission('orders:update-status'),
  validate({ params: idParamSchema, body: updateStatusSchema }),
  ctrl.updateStatus,
);

export default router;
