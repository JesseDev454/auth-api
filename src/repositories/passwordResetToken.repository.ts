import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { PasswordResetToken } from '../entities/PasswordResetToken';

export class PasswordResetTokenRepository {
  private get repository(): Repository<PasswordResetToken> {
    return AppDataSource.getRepository(PasswordResetToken);
  }

  public findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.repository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });
  }

  public getBaseRepository(): Repository<PasswordResetToken> {
    return this.repository;
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
