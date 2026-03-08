import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/appError';

export const authorize =
  (requiredRole: string) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required.'));
      return;
    }

    if (request.user.role !== requiredRole) {
      next(new AppError(403, 'FORBIDDEN', 'Forbidden'));
      return;
    }

    next();
  };
