import type { IPermissionRepository } from '@modules/identity/domain/rbac.repository';
import type {
  Permission,
  CreatePermissionInput,
  UpdatePermissionInput,
} from '@modules/identity/domain/permission.entity';
import { getPrisma } from '@shared/infra/prisma/client';
import { isNotFound } from '@shared/infra/prisma/errors';
import { mapPermission } from './mappers';

const clean = <T extends { slug?: string; section?: string }>(input: T): T => ({
  ...input,
  ...(input.slug === undefined ? {} : { slug: input.slug.trim().toLowerCase() }),
  ...(input.section === undefined ? {} : { section: input.section.trim().toLowerCase() }),
});

export class PrismaPermissionRepository implements IPermissionRepository {
  async findById(id: string): Promise<Permission | null> {
    const row = await getPrisma().permission.findUnique({ where: { id } });
    return row ? mapPermission(row) : null;
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    const rows = await getPrisma().permission.findMany({ where: { id: { in: ids } } });
    return rows.map(mapPermission);
  }

  async list(): Promise<Permission[]> {
    const rows = await getPrisma().permission.findMany({
      orderBy: [{ section: 'asc' }, { slug: 'asc' }],
    });
    return rows.map(mapPermission);
  }

  async create(input: CreatePermissionInput): Promise<Permission> {
    return mapPermission(await getPrisma().permission.create({ data: clean(input) }));
  }

  async update(id: string, input: UpdatePermissionInput): Promise<Permission | null> {
    try {
      return mapPermission(
        await getPrisma().permission.update({ where: { id }, data: clean(input) }),
      );
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async remove(id: string): Promise<Permission | null> {
    try {
      return mapPermission(await getPrisma().permission.delete({ where: { id } }));
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async upsertBySlug(slug: string, input: CreatePermissionInput): Promise<Permission> {
    const data = clean(input);
    return mapPermission(
      await getPrisma().permission.upsert({
        where: { slug: slug.trim().toLowerCase() },
        create: data,
        update: data,
      }),
    );
  }
}
