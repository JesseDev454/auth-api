import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { AppDataSource } from '../../config/database';
import { Role } from '../../entities/Role';

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
  console.info('Default roles seeded successfully.');
};

if (require.main === module) {
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
}
