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

  public getBaseRepository(manager?: EntityManager): Repository<RefreshToken> {
    return this.getRepository(manager);
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
