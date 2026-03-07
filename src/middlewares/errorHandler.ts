import { NextFunction, Request, Response } from 'express';

import { buildErrorResponse } from '../utils/response';

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
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const statusCode = error.statusCode ?? 500;
  const errorCode = error.code ?? 'INTERNAL_SERVER_ERROR';

  response.status(statusCode).json(
    buildErrorResponse(error.message || 'An unexpected error occurred.', errorCode, error.details),
  );
};
