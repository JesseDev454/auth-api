import { DataSource } from 'typeorm';

import { InitialSchema1741341600000 } from '../database/migrations/1741341600000-InitialSchema';
import { EmailVerificationToken } from '../entities/EmailVerificationToken';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { RefreshToken } from '../entities/RefreshToken';
import { Role } from '../entities/Role';
import { User } from '../entities/User';
import { env } from './env';

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(env.db.url
    ? {
        url: env.db.url,
      }
    : {
        host: env.db.host,
        port: env.db.port,
        username: env.db.username,
        password: env.db.password,
        database: env.db.database,
      }),
  synchronize: false,
  logging: env.nodeEnv === 'development',
  entities: [Role, User, RefreshToken, EmailVerificationToken, PasswordResetToken],
  migrations: [InitialSchema1741341600000],
  migrationsTableName: 'typeorm_migrations',
});
