import { Router } from 'express';
import { authenticate, requireAnyPermission } from '@modules/identity/http/middleware';
import { productCoverUpload, verifyImageUpload } from '@shared/http/middleware/upload';
import * as ctrl from '../controllers/uploads.controller';

const router = Router();

router.post(
  '/product-cover',
  authenticate,
  requireAnyPermission('products:create', 'products:update'),
  productCoverUpload.single('file'),
  verifyImageUpload,
  ctrl.uploadProductCover,
);

export default router;
