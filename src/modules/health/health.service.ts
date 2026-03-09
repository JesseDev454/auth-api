import { AppDataSource } from '../../config/database';
import { logger, serializeError } from '../../utils/logger';

interface HealthStatus {
  status: 'ok' | 'error';
  service: 'auth-api';
  timestamp: string;
  database: 'connected' | 'disconnected';
}

export class HealthService {
  public async getStatus(): Promise<HealthStatus> {
    try {
      if (!AppDataSource.isInitialized) {
        throw new Error('Database connection is not initialized.');
      }

      await AppDataSource.query('SELECT 1');

      return {
        status: 'ok',
        service: 'auth-api',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      logger.error(
        {
          event: 'health_check_failed',
          error: serializeError(error),
        },
        'Health check failed.',
      );

      return {
        status: 'error',
        service: 'auth-api',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      };
    }
  }
}

export const healthService = new HealthService();
