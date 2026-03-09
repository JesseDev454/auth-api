import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { AppDataSource } from '../../config/database';
import { Role } from '../../entities/Role';
import { logger, serializeError } from '../../utils/logger';

export const DEFAULT_ROLES: Array<Pick<Role, 'name' | 'description'>> = [
  {
    name: 'user',
    description: 'Default role for authenticated application users.',
  },
  {
    name: 'admin',
    description: 'Administrative role with elevated access.',
  },
];

export const seedDefaultRoles = async (dataSource: DataSource = AppDataSource): Promise<void> => {
  const repository = dataSource.getRepository(Role);

  await repository.upsert(DEFAULT_ROLES, ['name']);
};

const seedRoles = async (): Promise<void> => {
  await AppDataSource.initialize();
  await seedDefaultRoles(AppDataSource);
  logger.info(
    {
      event: 'roles_seeded',
      count: DEFAULT_ROLES.length,
    },
    'Default roles seeded successfully.',
  );
};

if (require.main === module) {
  void seedRoles()
    .catch((error: unknown) => {
      logger.error(
        {
          event: 'roles_seed_failed',
          error: serializeError(error),
        },
        'Failed to seed default roles.',
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    });
}
