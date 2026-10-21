import { Router } from 'express';
import { authenticate, requirePermission, requireAnyPermission } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import * as ctrl from '../controllers/reports.controller';
import {
  createIssueSchema,
  updateIssueSchema,
  idParamSchema,
  dateRangeQuerySchema,
} from '../validators/reports.validation';

const router = Router();
router.use(authenticate);

router.post(
  '/issues',
  requirePermission('reports:issues:create'),
  validate({ body: createIssueSchema }),
  ctrl.createIssue,
);
router.get(
  '/issues',
  requireAnyPermission('reports:issues:create', 'reports:manage'),
  ctrl.listIssues,
);
router.get(
  '/issues/:id',
  requireAnyPermission('reports:issues:create', 'reports:manage'),
  validate({ params: idParamSchema }),
  ctrl.getIssue,
);
router.patch(
  '/issues/:id',
  requireAnyPermission('reports:issues:create', 'reports:manage'),
  validate({ params: idParamSchema, body: updateIssueSchema }),
  ctrl.updateIssue,
);
router.delete(
  '/issues/:id',
  requireAnyPermission('reports:issues:create', 'reports:manage'),
  validate({ params: idParamSchema }),
  ctrl.deleteIssue,
);

router.get(
  '/analytics/revenue',
  requirePermission('reports:analytics'),
  validate({ query: dateRangeQuerySchema }),
  ctrl.revenueSummary,
);
router.get(
  '/analytics/orders-by-status',
  requirePermission('reports:analytics'),
  ctrl.ordersByStatus,
);
router.get(
  '/analytics/top-products',
  requirePermission('reports:analytics'),
  validate({ query: dateRangeQuerySchema }),
  ctrl.topProducts,
);
router.get(
  '/analytics/sales-by-date',
  requirePermission('reports:analytics'),
  validate({ query: dateRangeQuerySchema }),
  ctrl.salesByDate,
);

export default router;
