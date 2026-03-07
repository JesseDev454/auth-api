import { Router } from 'express';

import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.get('/', (request, response) => authController.getPlaceholder(request, response));
