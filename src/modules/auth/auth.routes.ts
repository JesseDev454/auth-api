import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.get('/', (request, response) => authController.getPlaceholder(request, response));
authRouter.post('/login', asyncHandler(authController.login.bind(authController)));
authRouter.post('/refresh', asyncHandler(authController.refresh.bind(authController)));
authRouter.post('/logout', authenticate, asyncHandler(authController.logout.bind(authController)));
authRouter.post(
  '/forgot-password',
  asyncHandler(authController.forgotPassword.bind(authController)),
);
authRouter.post('/reset-password', asyncHandler(authController.resetPassword.bind(authController)));
authRouter.post('/register', asyncHandler(authController.register.bind(authController)));
authRouter.post('/verify-email', asyncHandler(authController.verifyEmail.bind(authController)));
authRouter.post(
  '/resend-verification',
  asyncHandler(authController.resendVerification.bind(authController)),
);
