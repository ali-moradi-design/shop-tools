import type { IUserRepository } from '@modules/identity/domain/user.repository';
import type { User, CreateUserInput, UpdateUserInput } from '@modules/identity/domain/user.entity';
import { getPrisma } from '@shared/infra/prisma/client';
import { isNotFound } from '@shared/infra/prisma/errors';
import { mapUser, mapUserRolesPopulated, type UserRowWithRoles } from './mappers';

const withRoles = { roles: { include: { role: { include: { permissions: true } } } } } as const;

/** Users are soft-deleted: every read filters on `deletedAt: null`. */
export class PrismaUserRepository implements IUserRepository {
  async findById(
    id: string,
    opts?: { withPassword?: boolean; populateRoles?: boolean },
  ): Promise<User | null> {
    const row = await getPrisma().user.findFirst({
      where: { id, deletedAt: null },
      include: withRoles,
    });
    return row ? this.toUser(row, opts) : null;
  }

  async findByEmail(email: string, opts?: { withPassword?: boolean }): Promise<User | null> {
    const row = await getPrisma().user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: withRoles,
    });
    return row ? this.toUser(row, opts) : null;
  }

  async list(opts?: { populateRoles?: boolean }): Promise<User[]> {
    const rows = await getPrisma().user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: withRoles,
    });
    return rows.map((r) => this.toUser(r, opts));
  }

  async create(input: CreateUserInput): Promise<User> {
    const row = await getPrisma().user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        isActive: input.isActive ?? true,
        roles: { create: (input.roles ?? []).map((roleId) => ({ roleId })) },
      },
      include: withRoles,
    });
    return this.toUser(row);
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    try {
      const row = await getPrisma().user.update({
        where: { id },
        data: {
          name: input.name,
          email: input.email?.toLowerCase(),
          passwordHash: input.passwordHash,
          isActive: input.isActive,
          // replacing the list of roles = delete the old links, create the new ones
          ...(input.roles
            ? { roles: { deleteMany: {}, create: input.roles.map((roleId) => ({ roleId })) } }
            : {}),
        },
        include: withRoles,
      });
      return this.toUser(row, { populateRoles: true });
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async softDelete(id: string): Promise<User | null> {
    try {
      const row = await getPrisma().user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
        include: withRoles,
      });
      return this.toUser(row);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async count(): Promise<number> {
    return getPrisma().user.count({ where: { deletedAt: null } });
  }

  private toUser(
    row: UserRowWithRoles,
    opts?: { withPassword?: boolean; populateRoles?: boolean },
  ): User {
    const user = mapUser(row, opts?.withPassword);
    if (opts?.populateRoles) {
      (user as User & { rolesPopulated?: unknown }).rolesPopulated = mapUserRolesPopulated(row);
    }
    return user;
  }
}
