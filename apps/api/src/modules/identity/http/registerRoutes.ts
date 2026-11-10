import type { Router } from 'express';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import rolesRoutes from './routes/roles.routes';
import permissionsRoutes from './routes/permissions.routes';
import { accountRoutes, publicAccountRoutes } from './routes/account.routes';

export function registerIdentityRoutes(api: Router): void {
  api.use('/auth', publicAccountRoutes);
  api.use('/auth', authRoutes);
  api.use('/account', accountRoutes);
  api.use('/users', usersRoutes);
  api.use('/roles', rolesRoutes);
  api.use('/permissions', permissionsRoutes);
}
