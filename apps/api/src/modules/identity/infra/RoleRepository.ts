import type { IRoleRepository } from '@modules/identity/domain/rbac.repository';
import type { Role, CreateRoleInput, UpdateRoleInput } from '@modules/identity/domain/role.entity';
import { getPrisma } from '@shared/infra/prisma/client';
import { isNotFound } from '@shared/infra/prisma/errors';
import { mapRole } from './mappers';

const withPermissions = { permissions: { include: { permission: true } } } as const;

const links = (ids: string[]) => ids.map((permissionId) => ({ permissionId }));
const normalize = (name: string) => name.trim().toLowerCase();

export class PrismaRoleRepository implements IRoleRepository {
  async findById(id: string, populate = false): Promise<Role | null> {
    const row = await getPrisma().role.findUnique({ where: { id }, include: withPermissions });
    return row ? mapRole(row, populate) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const row = await getPrisma().role.findUnique({
      where: { name: normalize(name) },
      include: withPermissions,
    });
    return row ? mapRole(row, false) : null;
  }

  async findByIds(ids: string[], populate = false): Promise<Role[]> {
    const rows = await getPrisma().role.findMany({
      where: { id: { in: ids } },
      include: withPermissions,
    });
    return rows.map((r) => mapRole(r, populate));
  }

  async list(populate = false): Promise<Role[]> {
    const rows = await getPrisma().role.findMany({
      orderBy: { name: 'asc' },
      include: withPermissions,
    });
    return rows.map((r) => mapRole(r, populate));
  }

  async create(input: CreateRoleInput): Promise<Role> {
    const row = await getPrisma().role.create({
      data: {
        name: normalize(input.name),
        description: input.description,
        permissions: { create: links(input.permissions ?? []) },
      },
      include: withPermissions,
    });
    return mapRole(row, true);
  }

  async update(id: string, input: UpdateRoleInput): Promise<Role | null> {
    try {
      const row = await getPrisma().role.update({
        where: { id },
        data: {
          name: input.name === undefined ? undefined : normalize(input.name),
          description: input.description,
          ...(input.permissions
            ? { permissions: { deleteMany: {}, create: links(input.permissions) } }
            : {}),
        },
        include: withPermissions,
      });
      return mapRole(row, true);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async remove(id: string): Promise<Role | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await getPrisma().role.delete({ where: { id } });
    return existing;
  }

  async upsertByName(name: string, input: CreateRoleInput): Promise<Role> {
    const key = normalize(name);
    const row = await getPrisma().role.upsert({
      where: { name: key },
      create: {
        name: normalize(input.name),
        description: input.description,
        permissions: { create: links(input.permissions ?? []) },
      },
      update: {
        name: normalize(input.name),
        description: input.description,
        permissions: { deleteMany: {}, create: links(input.permissions ?? []) },
      },
      include: withPermissions,
    });
    return mapRole(row, false);
  }
}
