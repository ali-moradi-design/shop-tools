import type { IRoleRepository } from '@modules/identity/domain/rbac.repository';
import type { Role, CreateRoleInput, UpdateRoleInput } from '@modules/identity/domain/role.entity';
import { RoleModel } from './models/RoleModel';
import { mapRole } from './mappers';

export class MongooseRoleRepository implements IRoleRepository {
  async findById(id: string, populate = false): Promise<Role | null> {
    let q = RoleModel.findById(id);
    if (populate) q = q.populate('permissions');
    const doc = await q;
    return doc ? mapRole(doc) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const doc = await RoleModel.findOne({ name });
    return doc ? mapRole(doc) : null;
  }

  async findByIds(ids: string[], populate = false): Promise<Role[]> {
    let q = RoleModel.find({ _id: { $in: ids } });
    if (populate) q = q.populate('permissions');
    const docs = await q;
    return docs.map(mapRole);
  }

  async list(populate = false): Promise<Role[]> {
    let q = RoleModel.find().sort({ name: 1 });
    if (populate) q = q.populate('permissions');
    const docs = await q;
    return docs.map(mapRole);
  }

  async create(input: CreateRoleInput): Promise<Role> {
    const doc = await RoleModel.create({
      name: input.name,
      description: input.description,
      permissions: input.permissions ?? [],
    });
    await doc.populate('permissions');
    return mapRole(doc);
  }

  async update(id: string, input: UpdateRoleInput): Promise<Role | null> {
    const doc = await RoleModel.findByIdAndUpdate(id, input, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('permissions');
    return doc ? mapRole(doc) : null;
  }

  async remove(id: string): Promise<Role | null> {
    const doc = await RoleModel.findByIdAndDelete(id);
    return doc ? mapRole(doc) : null;
  }

  async upsertByName(name: string, input: CreateRoleInput): Promise<Role> {
    const doc = await RoleModel.findOneAndUpdate(
      { name },
      {
        name: input.name,
        description: input.description,
        permissions: input.permissions ?? [],
      },
      { upsert: true, returnDocument: 'after' },
    );
    return mapRole(doc!);
  }
}
