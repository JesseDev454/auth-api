import { Router } from 'express';

import { adminController } from './admin.controller';

export const adminRouter = Router();

adminRouter.get('/', (request, response) => adminController.getPlaceholder(request, response));
