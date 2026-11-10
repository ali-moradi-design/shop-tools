import type { IRoleRepository } from '@modules/identity/domain/rbac.repository';
import type { CreateRoleInput, UpdateRoleInput } from '@modules/identity/domain/role.entity';
import { AppError } from '@shared/errors/AppError';

const BUILT_IN = ['admin', 'customer'];

export class RoleService {
  constructor(private readonly roles: IRoleRepository) {}

  list() {
    return this.roles.list(true);
  }

  async getById(id: string) {
    const item = await this.roles.findById(id, true);
    if (!item) throw new AppError('Role not found', 404);
    return item;
  }

  create(input: CreateRoleInput) {
    return this.roles.create(input);
  }

  /** admin and customer are built in: sign-up and the admin area depend on them by name. */
  private async guardBuiltIn(id: string, input?: UpdateRoleInput) {
    const role = await this.roles.findById(id, false);
    if (!role || !BUILT_IN.includes(role.name)) return;
    if (!input) throw new AppError(`The ${role.name} role is built in and cannot be deleted`, 400);
    if (input.name !== undefined && input.name !== role.name) throw new AppError(`The ${role.name} role cannot be renamed`, 400);
    // removing the admin role's permissions would lock everyone out of the admin area
    if (role.name === 'admin' && input.permissions !== undefined) throw new AppError("The admin role's permissions cannot be changed", 400);
  }

  async update(id: string, input: UpdateRoleInput) {
    await this.guardBuiltIn(id, input);
    const item = await this.roles.update(id, input);
    if (!item) throw new AppError('Role not found', 404);
    return item;
  }

  async remove(id: string) {
    await this.guardBuiltIn(id);
    const item = await this.roles.remove(id);
    if (!item) throw new AppError('Role not found', 404);
  }
}
