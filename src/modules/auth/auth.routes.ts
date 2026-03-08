import { Router } from 'express';

import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.get('/', (request, response) => authController.getPlaceholder(request, response));
authRouter.post('/register', asyncHandler(authController.register.bind(authController)));
authRouter.post('/verify-email', asyncHandler(authController.verifyEmail.bind(authController)));
authRouter.post(
  '/resend-verification',
  asyncHandler(authController.resendVerification.bind(authController)),
);
