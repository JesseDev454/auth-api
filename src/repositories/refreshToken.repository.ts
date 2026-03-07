import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { RefreshToken } from '../entities/RefreshToken';

export class RefreshTokenRepository {
  private get repository(): Repository<RefreshToken> {
    return AppDataSource.getRepository(RefreshToken);
  }

  public findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });
  }

  public getBaseRepository(): Repository<RefreshToken> {
    return this.repository;
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
