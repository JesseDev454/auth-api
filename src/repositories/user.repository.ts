import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export class UserRepository {
  private get repository(): Repository<User> {
    return AppDataSource.getRepository(User);
  }

  public findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: { role: true },
    });
  }

  public findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: { role: true },
    });
  }

  public getBaseRepository(): Repository<User> {
    return this.repository;
  }
}

export const userRepository = new UserRepository();
