import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { Role } from '../entities/Role';

export class RoleRepository {
  private get repository(): Repository<Role> {
    return AppDataSource.getRepository(Role);
  }

  public findById(id: string): Promise<Role | null> {
    return this.repository.findOne({ where: { id } });
  }

  public findByName(name: string): Promise<Role | null> {
    return this.repository.findOne({ where: { name } });
  }

  public getBaseRepository(): Repository<Role> {
    return this.repository;
  }
}

export const roleRepository = new RoleRepository();
