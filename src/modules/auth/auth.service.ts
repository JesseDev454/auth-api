import { User } from '../../entities/User';
import { AppDataSource } from '../../config/database';
import { sendPasswordResetEmail } from '../../mails/sendPasswordResetEmail';
import { sendVerificationEmail } from '../../mails/sendVerificationEmail';
import { emailVerificationTokenRepository } from '../../repositories/emailVerificationToken.repository';
import { passwordResetTokenRepository } from '../../repositories/passwordResetToken.repository';
import { refreshTokenRepository } from '../../repositories/refreshToken.repository';
import { roleRepository } from '../../repositories/role.repository';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../utils/appError';
import { hashUtility } from '../../utils/hash';
import { ACCESS_TOKEN_EXPIRES_IN_SECONDS, jwtUtility } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import {
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  tokenUtility,
} from '../../utils/token';

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

interface VerifyEmailInput {
  token: string;
}

interface ResendVerificationInput {
  email: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RefreshInput {
  refreshToken: string;
}

interface LogoutInput {
  refreshToken: string;
}

interface ForgotPasswordInput {
  email: string;
}

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

interface LoginContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface RefreshContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface LogoutContext {
  userId: string;
}

interface AuthUserResponse {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
}

interface AuthUserProfileResponse extends AuthUserResponse {
  createdAt: string;
  updatedAt: string;
}

interface LoginResponse {
  user: AuthUserProfileResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
  };
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export class AuthService {
  public getPlaceholderMessage(): string {
    return 'Auth route placeholder';
  }

  public async register(input: RegisterInput): Promise<{ user: AuthUserResponse }> {
    const registrationResult = await AppDataSource.transaction(async (manager) => {
      const existingUser = await userRepository.findByEmail(
        input.email,
        { withDeleted: true },
        manager,
      );

      if (existingUser) {
        throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.');
      }

      const defaultRole = await roleRepository.findByName('user', manager);

      if (!defaultRole) {
        throw new AppError(500, 'ROLE_NOT_FOUND', 'Default user role is not configured.');
      }

      const passwordHash = await hashUtility.hashPassword(input.password);

      const createdUser = await userRepository.create(
        {
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          roleId: defaultRole.id,
        },
        manager,
      );

      const verificationToken = tokenUtility.buildEmailVerificationToken();

      await emailVerificationTokenRepository.create(
        {
          userId: createdUser.id,
          tokenHash: verificationToken.tokenHash,
          expiresAt: verificationToken.expiresAt,
        },
        manager,
      );

      const persistedUser = await userRepository.findById(createdUser.id, manager);

      if (!persistedUser) {
        throw new AppError(500, 'USER_NOT_FOUND', 'The registered user could not be reloaded.');
      }

      return {
        rawToken: verificationToken.rawToken,
        user: this.toAuthUserResponse(persistedUser),
      };
    });

    logger.info(
      {
        event: 'user_registration_success',
        email: registrationResult.user.email,
        userId: registrationResult.user.id,
      },
      'User registration successful.',
    );

    await sendVerificationEmail(
      {
        email: registrationResult.user.email,
        fullName: registrationResult.user.fullName,
      },
      registrationResult.rawToken,
    );

    return {
      user: registrationResult.user,
    };
  }

  public async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const tokenHash = tokenUtility.hashToken(input.token);

    await AppDataSource.transaction(async (manager) => {
      const verificationToken = await emailVerificationTokenRepository.findActiveByTokenHash(
        tokenHash,
        manager,
      );

      if (!verificationToken) {
        throw new AppError(
          400,
          'INVALID_VERIFICATION_TOKEN',
          'The verification token is invalid or has already been used.',
        );
      }

      if (verificationToken.expiresAt.getTime() <= Date.now()) {
        throw new AppError(
          400,
          'INVALID_VERIFICATION_TOKEN',
          'The verification token is invalid or has expired.',
        );
      }

      const verifiedUser = await userRepository.markEmailVerified(verificationToken.userId, manager);

      if (!verifiedUser) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      await emailVerificationTokenRepository.invalidateUnusedForUser(verificationToken.userId, manager);

      logger.info(
        {
          event: 'email_verification_success',
          email: verifiedUser.email,
          userId: verifiedUser.id,
        },
        'Email verification successful.',
      );
    });
  }

  public async resendVerificationEmail(input: ResendVerificationInput): Promise<void> {
    const user = await userRepository.findByEmail(input.email);

    if (!user || user.isEmailVerified) {
      return;
    }

    const rawToken = await AppDataSource.transaction(async (manager) => {
      await emailVerificationTokenRepository.invalidateUnusedForUser(user.id, manager);

      const verificationToken = tokenUtility.buildEmailVerificationToken();

      await emailVerificationTokenRepository.create(
        {
          userId: user.id,
          tokenHash: verificationToken.tokenHash,
          expiresAt: verificationToken.expiresAt,
        },
        manager,
      );

      return verificationToken.rawToken;
    });

    await sendVerificationEmail(
      {
        email: user.email,
        fullName: user.fullName,
      },
      rawToken,
    );
  }

  public async login(input: LoginInput, context: LoginContext): Promise<LoginResponse> {
    logger.info(
      {
        event: 'login_attempt',
        email: input.email,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
      'Login attempt received.',
    );

    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      logger.warn(
        {
          event: 'login_failure_user_not_found',
          email: input.email,
        },
        'Login failed.',
      );
      throw this.buildInvalidCredentialsError();
    }

    const isPasswordValid = await hashUtility.comparePassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      logger.warn(
        {
          event: 'login_failure_wrong_password',
          email: input.email,
          userId: user.id,
        },
        'Login failed.',
      );
      throw this.buildInvalidCredentialsError();
    }

    if (!user.isEmailVerified) {
      logger.warn(
        {
          event: 'login_failure_unverified_email',
          email: input.email,
          userId: user.id,
        },
        'Login failed.',
      );
      throw this.buildInvalidCredentialsError();
    }

    const accessToken = this.signAccessToken(user);

    const loginResult = await AppDataSource.transaction(async (manager) => {
      const refreshToken = tokenUtility.buildRefreshToken();

      await refreshTokenRepository.create(
        {
          userId: user.id,
          tokenHash: refreshToken.tokenHash,
          expiresAt: refreshToken.expiresAt,
          createdByIp: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
        manager,
      );

      logger.info(
        {
          event: 'refresh_token_persisted',
          email: user.email,
          userId: user.id,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
        'Refresh token persisted.',
      );

      const updatedUser = await userRepository.updateLastLogin(user.id, manager);

      if (!updatedUser) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      return {
        rawRefreshToken: refreshToken.rawToken,
        user: this.toAuthUserProfileResponse(updatedUser),
      };
    });

    logger.info(
      {
        event: 'login_success',
        email: loginResult.user.email,
        userId: loginResult.user.id,
      },
      'Login successful.',
    );

    return {
      user: loginResult.user,
      tokens: {
        accessToken,
        refreshToken: loginResult.rawRefreshToken,
        accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
        refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      },
    };
  }

  public async refresh(input: RefreshInput, context: RefreshContext): Promise<RefreshResponse> {
    logger.info(
      {
        event: 'refresh_token_attempt',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
      'Refresh token attempt received.',
    );

    const tokenHash = tokenUtility.hashToken(input.refreshToken);

    const existingRefreshToken = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existingRefreshToken) {
      logger.warn(
        {
          event: 'refresh_token_rejected',
          reason: 'not_found',
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
        'Refresh token rejected.',
      );
      throw this.buildInvalidRefreshTokenError();
    }

    if (existingRefreshToken.revokedAt) {
      logger.warn(
        {
          event: 'refresh_token_reuse_detected',
          userId: existingRefreshToken.userId,
          tokenId: existingRefreshToken.id,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
        'Refresh token reuse detected.',
      );
      const revokedSessionCount = await refreshTokenRepository.revokeActiveForUser(
        existingRefreshToken.userId,
      );
      logger.warn(
        {
          event: 'refresh_token_reuse_global_revocation',
          userId: existingRefreshToken.userId,
          revokedSessionCount,
        },
        'Active sessions revoked after refresh token reuse.',
      );
      throw this.buildInvalidRefreshTokenError();
    }

    if (existingRefreshToken.expiresAt.getTime() <= Date.now()) {
      logger.warn(
        {
          event: 'refresh_token_rejected',
          reason: 'expired',
          tokenId: existingRefreshToken.id,
          userId: existingRefreshToken.userId,
        },
        'Refresh token rejected.',
      );
      throw this.buildInvalidRefreshTokenError();
    }

    const refreshResult = await AppDataSource.transaction(async (manager) => {
      const user = await userRepository.findById(existingRefreshToken.userId, manager);

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      const rotatedRefreshToken = tokenUtility.buildRefreshToken();

      await refreshTokenRepository.create(
        {
          userId: user.id,
          tokenHash: rotatedRefreshToken.tokenHash,
          expiresAt: rotatedRefreshToken.expiresAt,
          createdByIp: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
        manager,
      );
      await refreshTokenRepository.revokeAndTrackUsage(existingRefreshToken.id, manager);

      return {
        accessToken: this.signAccessToken(user),
        refreshToken: rotatedRefreshToken.rawToken,
        userId: user.id,
      };
    });

    logger.info(
      {
        event: 'refresh_token_rotation_success',
        userId: refreshResult.userId,
      },
      'Refresh token rotation successful.',
    );

    return {
      accessToken: refreshResult.accessToken,
      refreshToken: refreshResult.refreshToken,
      accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    };
  }

  public async logout(input: LogoutInput, context: LogoutContext): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      const tokenHash = tokenUtility.hashToken(input.refreshToken);
      const refreshToken = await refreshTokenRepository.findByTokenHash(tokenHash, manager);

      if (refreshToken && refreshToken.userId === context.userId && !refreshToken.revokedAt) {
        await refreshTokenRepository.revoke(refreshToken.id, manager);
        logger.info(
          {
            event: 'logout_token_revoked',
            userId: context.userId,
            tokenId: refreshToken.id,
          },
          'Refresh token revoked during logout.',
        );
      }
    });

    logger.info(
      {
        event: 'logout_success',
        userId: context.userId,
      },
      'Logout successful.',
    );
  }

  public async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    logger.info(
      {
        event: 'forgot_password_requested',
        email: input.email,
      },
      'Forgot-password request received.',
    );

    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      logger.info(
        {
          event: 'forgot_password_unknown_email',
          email: input.email,
        },
        'Forgot-password request did not match a known user.',
      );
      return;
    }

    const rawToken = await AppDataSource.transaction(async (manager) => {
      await passwordResetTokenRepository.invalidateUnusedForUser(user.id, manager);

      const resetToken = tokenUtility.buildPasswordResetToken();

      await passwordResetTokenRepository.create(
        {
          userId: user.id,
          tokenHash: resetToken.tokenHash,
          expiresAt: resetToken.expiresAt,
        },
        manager,
      );

      return resetToken.rawToken;
    });

    await sendPasswordResetEmail(
      {
        email: user.email,
        fullName: user.fullName,
      },
      rawToken,
    );

    logger.info(
      {
        event: 'password_reset_email_sent',
        email: user.email,
        userId: user.id,
      },
      'Password reset email recorded.',
    );
  }

  public async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = tokenUtility.hashToken(input.token);

    const resetResult = await AppDataSource.transaction(async (manager) => {
      const passwordResetToken = await passwordResetTokenRepository.findByTokenHash(tokenHash, manager);

      if (!passwordResetToken) {
        logger.warn(
          {
            event: 'password_reset_token_invalid',
            reason: 'not_found',
          },
          'Password reset token invalid.',
        );
        throw this.buildInvalidPasswordResetTokenError();
      }

      if (passwordResetToken.usedAt) {
        logger.warn(
          {
            event: 'password_reset_token_invalid',
            reason: 'used',
            tokenId: passwordResetToken.id,
            userId: passwordResetToken.userId,
          },
          'Password reset token invalid.',
        );
        throw this.buildInvalidPasswordResetTokenError();
      }

      if (passwordResetToken.expiresAt.getTime() <= Date.now()) {
        logger.warn(
          {
            event: 'password_reset_token_expired',
            tokenId: passwordResetToken.id,
            userId: passwordResetToken.userId,
          },
          'Password reset token expired.',
        );
        throw this.buildInvalidPasswordResetTokenError();
      }

      const user = await userRepository.findById(passwordResetToken.userId, manager);

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      const passwordHash = await hashUtility.hashPassword(input.newPassword);
      const updatedUser = await userRepository.updatePassword(user.id, passwordHash, manager);

      if (!updatedUser) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      await passwordResetTokenRepository.markUsed(passwordResetToken.id, manager);
      await passwordResetTokenRepository.invalidateUnusedForUser(user.id, manager);

      const revokedRefreshTokenCount = await refreshTokenRepository.revokeActiveForUser(
        user.id,
        manager,
      );

      return {
        userId: user.id,
        revokedRefreshTokenCount,
      };
    });

    logger.info(
      {
        event: 'password_reset_refresh_tokens_revoked',
        userId: resetResult.userId,
        revokedRefreshTokenCount: resetResult.revokedRefreshTokenCount,
      },
      'Refresh tokens revoked after password reset.',
    );
    logger.info(
      {
        event: 'password_reset_success',
        userId: resetResult.userId,
      },
      'Password reset successful.',
    );
  }

  private signAccessToken(user: User): string {
    return jwtUtility.signAccessToken({
      userId: user.id,
      role: user.role.name,
      tokenType: 'access',
    });
  }

  private buildInvalidCredentialsError(): AppError {
    return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials', {});
  }

  private buildInvalidRefreshTokenError(): AppError {
    return new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token', {});
  }

  private buildInvalidPasswordResetTokenError(): AppError {
    return new AppError(
      401,
      'INVALID_PASSWORD_RESET_TOKEN',
      'Invalid password reset token',
      {},
    );
  }

  private toAuthUserResponse(user: User): AuthUserResponse {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      isEmailVerified: user.isEmailVerified,
    };
  }

  private toAuthUserProfileResponse(user: User): AuthUserProfileResponse {
    return {
      ...this.toAuthUserResponse(user),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
