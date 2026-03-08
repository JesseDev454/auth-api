import {
  JsonWebTokenError,
  NotBeforeError,
  type Secret,
  TokenExpiredError,
  sign,
  verify,
} from 'jsonwebtoken';

import { env } from '../config/env';
import { AppError } from './appError';

export interface JwtPayloadShape {
  userId: string;
  role: string;
  tokenType: 'access' | 'refresh';
}

type AccessTokenPayload = Omit<JwtPayloadShape, 'tokenType'> & {
  tokenType: 'access';
};

export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;

const ACCESS_TOKEN_SECRET: Secret = env.jwt.accessSecret;

const isJwtPayloadShape = (payload: unknown): payload is JwtPayloadShape => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Partial<JwtPayloadShape>;

  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.role === 'string' &&
    (candidate.tokenType === 'access' || candidate.tokenType === 'refresh')
  );
};

const createUnauthorizedError = (): AppError => {
  return new AppError(401, 'UNAUTHORIZED', 'The access token is invalid or expired.');
};

export const jwtUtility = {
  signAccessToken(payload: AccessTokenPayload): string {
    return sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    });
  },
  verifyAccessToken(token: string): JwtPayloadShape {
    try {
      const payload = verify(token, ACCESS_TOKEN_SECRET);

      if (!isJwtPayloadShape(payload)) {
        throw createUnauthorizedError();
      }

      return payload;
    } catch (error) {
      if (
        error instanceof TokenExpiredError ||
        error instanceof JsonWebTokenError ||
        error instanceof NotBeforeError
      ) {
        throw createUnauthorizedError();
      }

      throw error;
    }
  },
};
