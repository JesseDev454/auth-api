import { Router } from 'express';

import { userController } from './user.controller';

export const userRouter = Router();

userRouter.get('/', (request, response) => userController.getPlaceholder(request, response));
