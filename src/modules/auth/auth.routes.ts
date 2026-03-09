import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import {
  refreshRateLimiter,
  sensitiveAuthRateLimiter,
} from '../../middlewares/rateLimiter';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.get('/', (request, response) => authController.getPlaceholder(request, response));
authRouter.post(
  '/login',
  sensitiveAuthRateLimiter,
  asyncHandler(authController.login.bind(authController)),
);
authRouter.post(
  '/refresh',
  refreshRateLimiter,
  asyncHandler(authController.refresh.bind(authController)),
);
authRouter.post('/logout', authenticate, asyncHandler(authController.logout.bind(authController)));
authRouter.post(
  '/forgot-password',
  sensitiveAuthRateLimiter,
  asyncHandler(authController.forgotPassword.bind(authController)),
);
authRouter.post('/reset-password', asyncHandler(authController.resetPassword.bind(authController)));
authRouter.post('/register', asyncHandler(authController.register.bind(authController)));
authRouter.post('/verify-email', asyncHandler(authController.verifyEmail.bind(authController)));
authRouter.post(
  '/resend-verification',
  sensitiveAuthRateLimiter,
  asyncHandler(authController.resendVerification.bind(authController)),
);
