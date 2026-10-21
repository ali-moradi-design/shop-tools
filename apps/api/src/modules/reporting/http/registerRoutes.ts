import type { Router } from 'express';
import reportsRoutes from './routes/reports.routes';
import adminRoutes from './routes/admin.routes';

export function registerReportingRoutes(api: Router): void {
  api.use('/reports', reportsRoutes);
  api.use('/admin', adminRoutes);
}
