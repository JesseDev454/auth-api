import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';
import { userController } from './user.controller';

export const userRouter = Router();

userRouter.get('/me', authenticate, asyncHandler(userController.getMe.bind(userController)));
userRouter.get(
  '/sessions',
  authenticate,
  asyncHandler(userController.listSessions.bind(userController)),
);
userRouter.delete(
  '/sessions/:id',
  authenticate,
  asyncHandler(userController.revokeSession.bind(userController)),
);
userRouter.get('/', (request, response) => userController.getPlaceholder(request, response));
