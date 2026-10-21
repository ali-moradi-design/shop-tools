import type { Prisma } from '@prisma/client';
import type { User } from '../domain/user.entity';
import type { Permission } from '../domain/permission.entity';
import type { Role } from '../domain/role.entity';
import type { RefreshTokenRecord } from '../domain/auth.types';

export type UserRow = Prisma.UserGetPayload<{ include: { roles: true } }>;
export type UserRowWithRoles = Prisma.UserGetPayload<{
  include: { roles: { include: { role: { include: { permissions: true } } } } };
}>;
export type RoleRow = Prisma.RoleGetPayload<{ include: { permissions: { include: { permission: true } } } }>;

/** The password hash leaves the repository only when the caller asks for it. */
export function mapUser(row: UserRow, withPassword = false): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: withPassword ? row.passwordHash : undefined,
    roles: row.roles.map((r) => r.roleId),
    isActive: row.isActive,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Roles as the API shows them for `GET /users` (name and permission ids). */
export function mapUserRolesPopulated(row: UserRowWithRoles) {
  return row.roles.map(({ role }) => ({
    id: role.id,
    _id: role.id,
    name: role.name,
    description: role.description ?? undefined,
    permissions: role.permissions.map((p) => p.permissionId),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }));
}

export function mapPermission(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  section: string;
  createdAt: Date;
  updatedAt: Date;
}): Permission {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    section: row.section,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** `populate` returns permission objects, otherwise just their ids. */
export function mapRole(row: RoleRow, populate: boolean): Role {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    permissions: populate
      ? row.permissions.map(({ permission: p }) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description ?? undefined,
          section: p.section,
        }))
      : row.permissions.map((p) => p.permissionId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapRefreshToken(row: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByHash: string | null;
}): RefreshTokenRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    replacedByHash: row.replacedByHash,
  };
}
