import { EntityManager, IsNull, Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { EmailVerificationToken } from '../entities/EmailVerificationToken';

export class EmailVerificationTokenRepository {
  private getRepository(manager?: EntityManager): Repository<EmailVerificationToken> {
    return manager
      ? manager.getRepository(EmailVerificationToken)
      : AppDataSource.getRepository(EmailVerificationToken);
  }

  public findByTokenHash(
    tokenHash: string,
    manager?: EntityManager,
  ): Promise<EmailVerificationToken | null> {
    return this.getRepository(manager).findOne({
      where: { tokenHash },
      relations: { user: { role: true } },
    });
  }

  public findActiveByTokenHash(
    tokenHash: string,
    manager?: EntityManager,
  ): Promise<EmailVerificationToken | null> {
    return this.getRepository(manager).findOne({
      where: { tokenHash, usedAt: IsNull() },
      relations: { user: { role: true } },
    });
  }

  public create(
    data: Pick<EmailVerificationToken, 'userId' | 'tokenHash' | 'expiresAt'>,
    manager?: EntityManager,
  ): Promise<EmailVerificationToken> {
    const repository = this.getRepository(manager);
    const token = repository.create({
      ...data,
      usedAt: null,
    });

    return repository.save(token);
  }

  public async markUsed(id: string, manager?: EntityManager): Promise<void> {
    await this.getRepository(manager).update({ id }, { usedAt: new Date() });
  }

  public async invalidateUnusedForUser(userId: string, manager?: EntityManager): Promise<void> {
    await this.getRepository(manager)
      .createQueryBuilder()
      .update(EmailVerificationToken)
      .set({ usedAt: () => 'CURRENT_TIMESTAMP' })
      .where('user_id = :userId', { userId })
      .andWhere('used_at IS NULL')
      .execute();
  }

  public getBaseRepository(manager?: EntityManager): Repository<EmailVerificationToken> {
    return this.getRepository(manager);
  }
}

export const emailVerificationTokenRepository = new EmailVerificationTokenRepository();
