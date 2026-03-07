import 'reflect-metadata';

import { AppDataSource } from '../../config/database';
import { Role } from '../../entities/Role';

const DEFAULT_ROLES: Array<Pick<Role, 'name' | 'description'>> = [
  {
    name: 'user',
    description: 'Default role for authenticated application users.',
  },
  {
    name: 'admin',
    description: 'Administrative role with elevated access.',
  },
];

const seedRoles = async (): Promise<void> => {
  await AppDataSource.initialize();

  const repository = AppDataSource.getRepository(Role);

  await repository.upsert(DEFAULT_ROLES, ['name']);

  console.info('Default roles seeded successfully.');
};

void seedRoles()
  .catch((error: unknown) => {
    console.error('Failed to seed default roles.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
