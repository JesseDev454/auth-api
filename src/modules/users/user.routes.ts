import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';
import { userController } from './user.controller';

export const userRouter = Router();

userRouter.get('/me', authenticate, asyncHandler(userController.getMe.bind(userController)));
userRouter.get('/', (request, response) => userController.getPlaceholder(request, response));
