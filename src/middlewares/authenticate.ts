import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/appError';
import { jwtUtility } from '../utils/jwt';

export const authenticate = (request: Request, _response: Response, next: NextFunction): void => {
  try {
    const authorizationHeader = request.header('authorization');

    if (!authorizationHeader) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const bearerMatch = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    const accessToken = bearerMatch?.[1]?.trim();

    if (!accessToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const tokenPayload = jwtUtility.verifyAccessToken(accessToken);

    if (tokenPayload.tokenType !== 'access') {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    request.user = {
      userId: tokenPayload.userId,
      role: tokenPayload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
