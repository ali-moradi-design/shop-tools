import type { IPermissionRepository } from '@modules/identity/domain/rbac.repository';
import type {
  Permission,
  CreatePermissionInput,
  UpdatePermissionInput,
} from '@modules/identity/domain/permission.entity';
import { PermissionModel } from './models/PermissionModel';
import { mapPermission } from './mappers';

export class MongoosePermissionRepository implements IPermissionRepository {
  async findById(id: string): Promise<Permission | null> {
    const doc = await PermissionModel.findById(id);
    return doc ? mapPermission(doc) : null;
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    const docs = await PermissionModel.find({ _id: { $in: ids } });
    return docs.map(mapPermission);
  }

  async list(): Promise<Permission[]> {
    const docs = await PermissionModel.find().sort({ section: 1, slug: 1 });
    return docs.map(mapPermission);
  }

  async create(input: CreatePermissionInput): Promise<Permission> {
    const doc = await PermissionModel.create(input);
    return mapPermission(doc);
  }

  async update(id: string, input: UpdatePermissionInput): Promise<Permission | null> {
    const doc = await PermissionModel.findByIdAndUpdate(id, input, {
      returnDocument: 'after',
      runValidators: true,
    });
    return doc ? mapPermission(doc) : null;
  }

  async remove(id: string): Promise<Permission | null> {
    const doc = await PermissionModel.findByIdAndDelete(id);
    return doc ? mapPermission(doc) : null;
  }

  async upsertBySlug(slug: string, input: CreatePermissionInput): Promise<Permission> {
    const doc = await PermissionModel.findOneAndUpdate({ slug }, input, {
      upsert: true,
      returnDocument: 'after',
    });
    return mapPermission(doc!);
  }
}
