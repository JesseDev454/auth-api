import { Request, Response } from 'express';

import { AppError } from '../../utils/appError';
import { buildSuccessResponse } from '../../utils/response';
import { adminService } from './admin.service';
import {
  parseListUsersQuery,
  parseUpdateUserRoleParams,
  parseUpdateUserRoleRequest,
} from './admin.validation';

export class AdminController {
  public getPlaceholder(_request: Request, response: Response): void {
    response
      .status(200)
      .json(buildSuccessResponse(adminService.getPlaceholderMessage(), { module: 'admin' }));
  }

  public async listUsers(request: Request, response: Response): Promise<void> {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const query = parseListUsersQuery(request.query);
    const result = await adminService.listUsers(request.user.userId, query);

    response.status(200).json(buildSuccessResponse('Users fetched successfully', result));
  }

  public async updateUserRole(request: Request, response: Response): Promise<void> {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const params = parseUpdateUserRoleParams(request.params);
    const payload = parseUpdateUserRoleRequest(request.body);
    const result = await adminService.updateUserRole({
      adminUserId: request.user.userId,
      targetUserId: params.id,
      role: payload.role,
    });

    response.status(200).json(buildSuccessResponse('User role updated successfully', result));
  }
}

export const adminController = new AdminController();
