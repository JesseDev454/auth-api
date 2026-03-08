import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import { adminController } from './admin.controller';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'));

adminRouter.get('/', (request, response) => adminController.getPlaceholder(request, response));
adminRouter.get('/users', asyncHandler(adminController.listUsers.bind(adminController)));
adminRouter.patch(
  '/users/:id/role',
  asyncHandler(adminController.updateUserRole.bind(adminController)),
);
