import { Request, Response } from 'express';

import { buildSuccessResponse } from '../../utils/response';
import { adminService } from './admin.service';

export class AdminController {
  public getPlaceholder(_request: Request, response: Response): void {
    response
      .status(200)
      .json(buildSuccessResponse(adminService.getPlaceholderMessage(), { module: 'admin' }));
  }
}

export const adminController = new AdminController();
