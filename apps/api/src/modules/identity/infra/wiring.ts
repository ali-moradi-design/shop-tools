import { PrismaUserRepository } from './UserRepository';
import { PrismaRoleRepository } from './RoleRepository';
import { PrismaPermissionRepository } from './PermissionRepository';
import { PrismaRefreshTokenRepository } from './RefreshTokenRepository';
import { JwtTokenService } from './token.service';
import { BcryptPasswordHasher } from './password.service';
import { AuthService } from '../application/auth.service';
import { UserService } from '../application/user.service';
import { PermissionService } from '../application/permission.service';
import { RoleService } from '../application/role.service';
import { AuthContextService } from '../application/auth-context.service';

export const userRepo = new PrismaUserRepository();
export const roleRepo = new PrismaRoleRepository();
export const permissionRepo = new PrismaPermissionRepository();
export const refreshTokenRepo = new PrismaRefreshTokenRepository();
export const tokenService = new JwtTokenService();
export const passwordHasher = new BcryptPasswordHasher();

export const authService = new AuthService(
  userRepo,
  roleRepo,
  refreshTokenRepo,
  tokenService,
  passwordHasher,
);
export const userService = new UserService(userRepo, passwordHasher);
export const permissionService = new PermissionService(permissionRepo);
export const roleService = new RoleService(roleRepo);
export const authContextService = new AuthContextService(userRepo, roleRepo, tokenService);
