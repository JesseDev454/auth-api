import rateLimit from 'express-rate-limit';

import { buildErrorResponse } from '../utils/response';

const createRateLimitHandler = (message: string, code: string) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
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
);

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json(
      buildErrorResponse(
        'Too many authentication requests. Please try again later.',
        'RATE_LIMIT_EXCEEDED',
      ),
    );
  },
});
