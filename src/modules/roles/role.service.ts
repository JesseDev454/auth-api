export class RoleService {
  public getDefaultRoleNames(): string[] {
    return ['user', 'admin'];
  }
}

export const roleService = new RoleService();
