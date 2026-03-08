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

  public async updateLastLogin(id: string, manager?: EntityManager): Promise<User | null> {
    const repository = this.getRepository(manager);

    await repository.save({
      id,
      lastLoginAt: new Date(),
    });

    return this.findById(id, manager);
  }

  public async updatePassword(
    id: string,
    passwordHash: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    const repository = this.getRepository(manager);

    await repository.save({
      id,
      passwordHash,
    });

    return this.findById(id, manager);
  }

  public async listUsersPaginated(
    options: { page: number; limit: number },
    manager?: EntityManager,
  ): Promise<{ users: User[]; total: number }> {
    const repository = this.getRepository(manager);
    const [users, total] = await repository.findAndCount({
      relations: { role: true },
      order: { createdAt: 'DESC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return { users, total };
  }

  public async updateUserRole(
    id: string,
    roleId: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    const repository = this.getRepository(manager);

    await repository.save({
      id,
      roleId,
    });

    return this.findById(id, manager);
  }

  public getBaseRepository(manager?: EntityManager): Repository<User> {
    return this.getRepository(manager);
  }
}

export const userRepository = new UserRepository();
