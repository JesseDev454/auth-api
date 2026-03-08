import 'reflect-metadata';

import { Client } from 'pg';

import { AppDataSource } from '../src/config/database';
import { env } from '../src/config/env';
import { seedDefaultRoles } from '../src/database/seeds/seedRoles';

const APP_TABLES = [
  'refresh_tokens',
  'password_reset_tokens',
  'email_verification_tokens',
  'users',
  'roles',
] as const;

const ensureTestDatabaseExists = async (): Promise<void> => {
  const adminClient = new Client({
    host: env.db.host,
    port: env.db.port,
    user: env.db.username,
    password: env.db.password,
    database: 'postgres',
  });

  await adminClient.connect();

  const databaseExistsResult = await adminClient.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [env.db.database],
  );

  if (databaseExistsResult.rowCount === 0) {
    const escapedDatabaseName = env.db.database.replace(/"/g, '""');
    await adminClient.query(`CREATE DATABASE "${escapedDatabaseName}"`);
  }

  await adminClient.end();
};

const clearDatabase = async (): Promise<void> => {
  const tableList = APP_TABLES.map((tableName) => `"${tableName}"`).join(', ');
  await AppDataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
  await seedDefaultRoles(AppDataSource);
};

const silenceConsole = (): void => {
  if (process.env.TEST_DEBUG_LOGS === 'true') {
    return;
  }

  jest.spyOn(console, 'info').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
};

beforeAll(async () => {
  silenceConsole();
  await ensureTestDatabaseExists();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await AppDataSource.runMigrations();
  await clearDatabase();
});

beforeEach(async () => {
  jest.restoreAllMocks();
  silenceConsole();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await clearDatabase();
});

afterAll(async () => {
  jest.restoreAllMocks();

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});
