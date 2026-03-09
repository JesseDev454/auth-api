import { randomUUID } from 'node:crypto';

import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

export const requestLogger = (request: Request, response: Response, next: NextFunction): void => {
  const startedAt = Date.now();
  const requestId = randomUUID();

  response.setHeader('x-request-id', requestId);

  response.on('finish', () => {
    const durationInMs = Date.now() - startedAt;

    logger.info(
      {
        event: 'http_request_completed',
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: durationInMs,
        ipAddress: request.ip ?? null,
        userAgent: request.get('user-agent') ?? null,
      },
      'HTTP request completed.',
    );
  });

  next();
};
