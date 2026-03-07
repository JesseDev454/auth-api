import { Request, Response } from 'express';

import { buildSuccessResponse } from '../../utils/response';
import { userService } from './user.service';

export class UserController {
  public getPlaceholder(_request: Request, response: Response): void {
    response
      .status(200)
      .json(buildSuccessResponse(userService.getPlaceholderMessage(), { module: 'users' }));
  }
}

export const userController = new UserController();
