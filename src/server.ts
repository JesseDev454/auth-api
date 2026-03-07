import 'reflect-metadata';

import { Server } from 'node:http';

import { createApp } from './app';
import { AppDataSource } from './config/database';
import { env } from './config/env';

const app = createApp();

const shutdown = (server: Server, signal: string): void => {
  console.info(`Received ${signal}. Shutting down gracefully.`);

  server.close(() => {
    const destroyDataSource = AppDataSource.isInitialized
      ? AppDataSource.destroy()
      : Promise.resolve();

    void destroyDataSource.finally(() => {
      process.exit(0);
    });
  });
};

const bootstrap = async (): Promise<void> => {
  await AppDataSource.initialize();
  console.info('PostgreSQL connection established.');

  const server = app.listen(env.port, () => {
    console.info(`Authentication API listening on port ${env.port} in ${env.nodeEnv} mode.`);
  });

  process.on('SIGINT', () => shutdown(server, 'SIGINT'));
  process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
};

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start the Authentication API.', error);
  process.exit(1);
});
