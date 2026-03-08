import { Request, Response } from 'express';

import { buildSuccessResponse } from '../../utils/response';
import { authService } from './auth.service';
import {
  parseRegisterRequest,
  parseResendVerificationRequest,
  parseVerifyEmailRequest,
} from './auth.validation';

export class AuthController {
  public getPlaceholder(_request: Request, response: Response): void {
    response
      .status(200)
      .json(buildSuccessResponse(authService.getPlaceholderMessage(), { module: 'auth' }));
  }

  public async register(request: Request, response: Response): Promise<void> {
    const payload = parseRegisterRequest(request.body);
    const result = await authService.register(payload);

    response.status(201).json(
      buildSuccessResponse('Registration successful. Please verify your email.', {
        user: result.user,
      }),
    );
  }

  public async verifyEmail(request: Request, response: Response): Promise<void> {
    const payload = parseVerifyEmailRequest(request.body);

    await authService.verifyEmail(payload);

    response.status(200).json(buildSuccessResponse('Email verified successfully', {}));
  }

  public async resendVerification(request: Request, response: Response): Promise<void> {
    const payload = parseResendVerificationRequest(request.body);

    await authService.resendVerificationEmail(payload);

    response.status(200).json(
      buildSuccessResponse(
        'If the account exists and is not yet verified, a verification email has been sent',
        {},
      ),
    );
  }
}

export const authController = new AuthController();
