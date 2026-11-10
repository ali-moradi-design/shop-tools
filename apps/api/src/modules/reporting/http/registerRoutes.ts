import type { Router } from 'express';
import reportsRoutes from './routes/reports.routes';
import adminRoutes from './routes/admin.routes';
import { insightsRouter } from '../insights';

export { auditTrail } from '../insights';

export function registerReportingRoutes(api: Router): void {
  api.use('/reports', reportsRoutes);
  api.use('/admin', insightsRouter);
  api.use('/admin', adminRoutes);
}
