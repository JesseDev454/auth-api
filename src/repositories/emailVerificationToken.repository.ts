import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database';
import { EmailVerificationToken } from '../entities/EmailVerificationToken';

export class EmailVerificationTokenRepository {
  private get repository(): Repository<EmailVerificationToken> {
    return AppDataSource.getRepository(EmailVerificationToken);
  }

  public findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    return this.repository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });
  }

  public getBaseRepository(): Repository<EmailVerificationToken> {
    return this.repository;
  }
}

export const emailVerificationTokenRepository = new EmailVerificationTokenRepository();
