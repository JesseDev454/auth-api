import 'reflect-metadata';

import { Server } from 'node:http';

import { createApp } from './app';
import { AppDataSource } from './config/database';
import { env } from './config/env';
import { logger, serializeError } from './utils/logger';

const app = createApp();
let isShuttingDown = false;

const shutdown = (server: Server, signal: string): void => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.info(
    {
      event: 'server_shutdown_started',
      signal,
    },
    'Received shutdown signal.',
  );

  server.close(() => {
    const destroyDataSource = AppDataSource.isInitialized
      ? AppDataSource.destroy()
      : Promise.resolve();

    void destroyDataSource.finally(() => {
      logger.info(
        {
          event: 'server_shutdown_completed',
          signal,
        },
        'HTTP server and database connections closed.',
      );
      process.exit(0);
    });
  });
};

const bootstrap = async (): Promise<void> => {
  await AppDataSource.initialize();
  logger.info(
    {
      event: 'database_connected',
      database: env.db.database,
    },
    'PostgreSQL connection established.',
  );

  const server = app.listen(env.port, () => {
    logger.info(
      {
        event: 'server_started',
        port: env.port,
        environment: env.nodeEnv,
      },
      'Authentication API listening.',
    );
  });

  process.on('SIGINT', () => shutdown(server, 'SIGINT'));
  process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
};

void bootstrap().catch((error: unknown) => {
  logger.error(
    {
      event: 'server_startup_failed',
      error: serializeError(error),
    },
    'Failed to start the Authentication API.',
  );
  process.exit(1);
});
