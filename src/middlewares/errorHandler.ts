import { NextFunction, Request, Response } from 'express';

import { buildErrorResponse } from '../utils/response';
import { logger, serializeError } from '../utils/logger';

type ApplicationError = Error & {
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
};

export const notFoundHandler = (request: Request, response: Response): void => {
  response.status(404).json(
    buildErrorResponse('Route not found', 'NOT_FOUND', {
      path: request.originalUrl,
    }),
  );
};

export const errorHandler = (
  error: ApplicationError,
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const statusCode = error.statusCode ?? 500;
  const errorCode = error.code ?? 'INTERNAL_SERVER_ERROR';

  const logPayload = {
    event: 'request_error',
    method: request.method,
    path: request.originalUrl,
    statusCode,
    errorCode,
    details: error.details,
    error: serializeError(error),
  };

  if (statusCode >= 500) {
    logger.error(logPayload, error.message || 'Unhandled application error.');
  } else {
    logger.warn(logPayload, error.message || 'Handled application error.');
  }

  response.status(statusCode).json(
    buildErrorResponse(error.message || 'An unexpected error occurred.', errorCode, error.details),
  );
};
