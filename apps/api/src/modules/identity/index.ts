export { registerIdentityRoutes } from './http/registerRoutes';
export {
  authService,
  userService,
  permissionService,
  roleService,
  authContextService,
  userRepo,
  roleRepo,
  permissionRepo,
  refreshTokenRepo,
  tokenService,
  passwordHasher,
} from './infra/wiring';
export {
  authenticate,
  requirePermission,
  requireAnyPermission,
} from './http/middleware/auth';
export type { AuthUserContext } from './domain/auth.types';
export type { User, PublicUser } from './domain/user.entity';
export type { IUserRepository } from './domain/user.repository';
export type { IRoleRepository, IPermissionRepository } from './domain/rbac.repository';
export { hasAllPermissions, hasAnyPermission } from './domain/rules/hasPermission';
export { authPaths } from './http/docs/auth.paths';
export { usersPaths } from './http/docs/users.paths';
export { rbacPaths } from './http/docs/rbac.paths';
