import { Request, Response } from 'express';

import { AppError } from '../../utils/appError';
import { buildSuccessResponse } from '../../utils/response';
import { userService } from './user.service';
import { parseSessionIdParams } from './user.validation';

export class UserController {
  public getPlaceholder(_request: Request, response: Response): void {
    response
      .status(200)
      .json(buildSuccessResponse(userService.getPlaceholderMessage(), { module: 'users' }));
  }

  public async getMe(request: Request, response: Response): Promise<void> {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const result = await userService.getMe(request.user.userId);

    response.status(200).json(buildSuccessResponse('User profile fetched successfully', result));
  }

  public async listSessions(request: Request, response: Response): Promise<void> {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const result = await userService.listSessions(request.user.userId);

    response.status(200).json(buildSuccessResponse('Sessions fetched successfully', result));
  }

  public async revokeSession(request: Request, response: Response): Promise<void> {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const params = parseSessionIdParams(request.params);

    await userService.revokeSession(request.user.userId, params.id);

    response.status(200).json(buildSuccessResponse('Session revoked successfully', {}));
  }
}

export const userController = new UserController();
