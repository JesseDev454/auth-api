import { Request, Response } from 'express';

import { AppError } from '../../utils/appError';
import { buildSuccessResponse } from '../../utils/response';
import { authService } from './auth.service';
import {
  parseLoginRequest,
  parseLogoutRequest,
  parseRefreshTokenRequest,
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

  public async login(request: Request, response: Response): Promise<void> {
    const payload = parseLoginRequest(request.body);
    const result = await authService.login(payload, {
      ipAddress: request.ip || null,
      userAgent: request.get('user-agent') ?? null,
    });

    response.status(200).json(buildSuccessResponse('Login successful', result));
  }

  public async refresh(request: Request, response: Response): Promise<void> {
    const payload = parseRefreshTokenRequest(request.body);
    const result = await authService.refresh(payload);

    response
      .status(200)
      .json(buildSuccessResponse('Access token refreshed successfully', result));
  }

  public async logout(request: Request, response: Response): Promise<void> {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    const payload = parseLogoutRequest(request.body);

    await authService.logout(payload, {
      userId: request.user.userId,
    });

    response.status(200).json(buildSuccessResponse('Logout successful', {}));
  }
}

export const authController = new AuthController();
