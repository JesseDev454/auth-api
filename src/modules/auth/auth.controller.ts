import { Request, Response } from 'express';

import { buildSuccessResponse } from '../../utils/response';
import { authService } from './auth.service';

export class AuthController {
  public getPlaceholder(_request: Request, response: Response): void {
    response
      .status(200)
      .json(buildSuccessResponse(authService.getPlaceholderMessage(), { module: 'auth' }));
  }
}

export const authController = new AuthController();
