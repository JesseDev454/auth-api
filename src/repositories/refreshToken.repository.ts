import { EntityManager, Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { RefreshToken } from '../entities/RefreshToken';

export class RefreshTokenRepository {
  private getRepository(manager?: EntityManager): Repository<RefreshToken> {
    return manager ? manager.getRepository(RefreshToken) : AppDataSource.getRepository(RefreshToken);
  }

  public findByTokenHash(tokenHash: string, manager?: EntityManager): Promise<RefreshToken | null> {
    return this.getRepository(manager).findOne({
      where: { tokenHash },
      relations: { user: true },
    });
  }

  public async create(
    data: Pick<RefreshToken, 'userId' | 'tokenHash' | 'expiresAt' | 'createdByIp' | 'userAgent'>,
    manager?: EntityManager,
  ): Promise<RefreshToken> {
    const repository = this.getRepository(manager);
    const refreshToken = repository.create({
      ...data,
      revokedAt: null,
      lastUsedAt: null,
    });

    return repository.save(refreshToken);
  }

  public async updateLastUsed(id: string, manager?: EntityManager): Promise<RefreshToken | null> {
    const repository = this.getRepository(manager);

    await repository.update({ id }, { lastUsedAt: new Date() });

    return repository.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  public async revoke(id: string, manager?: EntityManager): Promise<RefreshToken | null> {
    const repository = this.getRepository(manager);

    await repository.update({ id }, { revokedAt: new Date() });

    return repository.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  public async revokeActiveForUser(userId: string, manager?: EntityManager): Promise<number> {
    const repository = this.getRepository(manager);
    const result = await repository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();

    return result.affected ?? 0;
  }

  public getBaseRepository(manager?: EntityManager): Repository<RefreshToken> {
    return this.getRepository(manager);
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
