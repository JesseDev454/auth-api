import { EntityManager, Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { PasswordResetToken } from '../entities/PasswordResetToken';

export class PasswordResetTokenRepository {
  private getRepository(manager?: EntityManager): Repository<PasswordResetToken> {
    return manager
      ? manager.getRepository(PasswordResetToken)
      : AppDataSource.getRepository(PasswordResetToken);
  }

  public findByTokenHash(
    tokenHash: string,
    manager?: EntityManager,
  ): Promise<PasswordResetToken | null> {
    return this.getRepository(manager).findOne({
      where: { tokenHash },
      relations: { user: true },
    });
  }

  public async create(
    data: Pick<PasswordResetToken, 'userId' | 'tokenHash' | 'expiresAt'>,
    manager?: EntityManager,
  ): Promise<PasswordResetToken> {
    const repository = this.getRepository(manager);
    const resetToken = repository.create({
      ...data,
      usedAt: null,
    });

    return repository.save(resetToken);
  }

  public async markUsed(id: string, manager?: EntityManager): Promise<PasswordResetToken | null> {
    const repository = this.getRepository(manager);

    await repository.update({ id }, { usedAt: new Date() });

    return repository.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  public async invalidateUnusedForUser(userId: string, manager?: EntityManager): Promise<number> {
    const repository = this.getRepository(manager);
    const result = await repository
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ usedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('used_at IS NULL')
      .execute();

    return result.affected ?? 0;
  }

  public getBaseRepository(manager?: EntityManager): Repository<PasswordResetToken> {
    return this.getRepository(manager);
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
