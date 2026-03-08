import { EntityManager, Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { Role } from '../entities/Role';

export class RoleRepository {
  private getRepository(manager?: EntityManager): Repository<Role> {
    return manager ? manager.getRepository(Role) : AppDataSource.getRepository(Role);
  }

  public findById(id: string, manager?: EntityManager): Promise<Role | null> {
    return this.getRepository(manager).findOne({ where: { id } });
  }

  public findByName(name: string, manager?: EntityManager): Promise<Role | null> {
    return this.getRepository(manager).findOne({ where: { name } });
  }

  public getBaseRepository(manager?: EntityManager): Repository<Role> {
    return this.getRepository(manager);
  }
}

export const roleRepository = new RoleRepository();
