import { Request, Response } from 'express';

import { healthService } from './health.service';

export class HealthController {
  public async getStatus(_request: Request, response: Response): Promise<void> {
    const status = await healthService.getStatus();
    const statusCode = status.status === 'ok' ? 200 : 503;

    response.status(statusCode).json(status);
  }
}

export const healthController = new HealthController();
