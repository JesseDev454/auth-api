import rateLimit from 'express-rate-limit';

import { env } from '../config/env';
import { buildErrorResponse } from '../utils/response';

const createRateLimitHandler = (message: string, code: string, max: number) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    skip: () => env.nodeEnv === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json(buildErrorResponse(message, code));
    },
  });
};

export const globalRateLimiter = createRateLimitHandler(
  'Too many requests. Please try again later.',
  'RATE_LIMIT_EXCEEDED',
  100,
);

export const sensitiveAuthRateLimiter = createRateLimitHandler(
  'Too many authentication requests. Please try again later.',
  'RATE_LIMIT_EXCEEDED',
  20,
);

export const refreshRateLimiter = createRateLimitHandler(
  'Too many token refresh requests. Please try again later.',
  'RATE_LIMIT_EXCEEDED',
  30,
);
