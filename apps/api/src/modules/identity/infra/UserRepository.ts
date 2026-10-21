import type { IUserRepository } from '@modules/identity/domain/user.repository';
import type { User, CreateUserInput, UpdateUserInput } from '@modules/identity/domain/user.entity';
import { UserModel } from './models/UserModel';
import { mapUser } from './mappers';

export class MongooseUserRepository implements IUserRepository {
  async findById(
    id: string,
    opts?: { withPassword?: boolean; populateRoles?: boolean },
  ): Promise<User | null> {
    let q = UserModel.findById(id);
    if (opts?.withPassword) q = q.select('+passwordHash');
    if (opts?.populateRoles) q = q.populate('roles');
    const doc = await q;
    if (!doc) return null;
    const user = mapUser(doc);
    if (opts?.populateRoles) {
      (user as User & { rolesPopulated?: unknown }).rolesPopulated = doc.roles;
    }
    return user;
  }

  async findByEmail(
    email: string,
    opts?: { withPassword?: boolean },
  ): Promise<User | null> {
    let q = UserModel.findOne({ email: email.toLowerCase() });
    if (opts?.withPassword) q = q.select('+passwordHash');
    const doc = await q;
    return doc ? mapUser(doc) : null;
  }

  async list(opts?: { populateRoles?: boolean }): Promise<User[]> {
    let q = UserModel.find().sort({ createdAt: -1 });
    if (opts?.populateRoles) q = q.populate('roles');
    const docs = await q;
    return docs.map((d) => {
      const u = mapUser(d);
      if (opts?.populateRoles) {
        (u as User & { rolesPopulated?: unknown }).rolesPopulated = d.roles;
      }
      return u;
    });
  }

  async create(input: CreateUserInput): Promise<User> {
    const doc = await UserModel.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      roles: input.roles ?? [],
      isActive: input.isActive ?? true,
    });
    return mapUser(doc);
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const updates: Record<string, unknown> = { ...input };
    if (input.email) updates.email = input.email.toLowerCase();
    const doc = await UserModel.findByIdAndUpdate(id, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('roles');
    if (!doc) return null;
    const u = mapUser(doc);
    (u as User & { rolesPopulated?: unknown }).rolesPopulated = doc.roles;
    return u;
  }

  async softDelete(id: string): Promise<User | null> {
    const doc = await UserModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' },
    );
    return doc ? mapUser(doc) : null;
  }

  async count(): Promise<number> {
    return UserModel.countDocuments();
  }
}
