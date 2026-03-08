import { EntityManager, Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export class UserRepository {
  private getRepository(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : AppDataSource.getRepository(User);
  }

  public findById(id: string, manager?: EntityManager): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { id },
      relations: { role: true },
    });
  }

  public findByEmail(
    email: string,
    options?: { withDeleted?: boolean },
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepository(manager).findOne({
      where: { email },
      relations: { role: true },
      withDeleted: options?.withDeleted ?? false,
    });
  }

  public async create(
    data: Pick<User, 'fullName' | 'email' | 'passwordHash' | 'roleId'>,
    manager?: EntityManager,
  ): Promise<User> {
    const repository = this.getRepository(manager);
    const user = repository.create({
      ...data,
      isEmailVerified: false,
      lastLoginAt: null,
    });

    return repository.save(user);
  }

  public async markEmailVerified(id: string, manager?: EntityManager): Promise<User | null> {
    const repository = this.getRepository(manager);

    await repository.update({ id }, { isEmailVerified: true });

    return this.findById(id, manager);
  }

  public getBaseRepository(manager?: EntityManager): Repository<User> {
    return this.getRepository(manager);
  }
}

export const userRepository = new UserRepository();
