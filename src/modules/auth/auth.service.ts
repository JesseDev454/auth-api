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

    console.info(`User registration successful for ${registrationResult.user.email}`);

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

      console.info(`Email verification successful for ${verifiedUser.email}`);
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
    console.info(`Login attempt for ${input.email}`);

    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      console.warn(`login_failure_user_not_found email=${input.email}`);
      throw this.buildInvalidCredentialsError();
    }

    const isPasswordValid = await hashUtility.comparePassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      console.warn(`login_failure_wrong_password email=${input.email}`);
      throw this.buildInvalidCredentialsError();
    }

    if (!user.isEmailVerified) {
      console.warn(`login_failure_unverified_email email=${input.email}`);
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

      console.info(`Refresh token persisted for ${user.email}`);

      const updatedUser = await userRepository.updateLastLogin(user.id, manager);

      if (!updatedUser) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      return {
        rawRefreshToken: refreshToken.rawToken,
        user: this.toAuthUserProfileResponse(updatedUser),
      };
    });

    console.info(`Login successful for ${loginResult.user.email}`);

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
    console.info('refresh_token_attempt');

    const tokenHash = tokenUtility.hashToken(input.refreshToken);

    const existingRefreshToken = await refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existingRefreshToken) {
      console.warn('refresh_token_rejected reason=not_found');
      throw this.buildInvalidRefreshTokenError();
    }

    if (existingRefreshToken.revokedAt) {
      console.warn(
        `refresh_token_reuse_detected userId=${existingRefreshToken.userId} tokenId=${existingRefreshToken.id} ip=${context.ipAddress ?? 'unknown'} userAgent=${context.userAgent ?? 'unknown'}`,
      );
      const revokedSessionCount = await refreshTokenRepository.revokeActiveForUser(
        existingRefreshToken.userId,
      );
      console.warn(
        `refresh_token_reuse_global_revocation userId=${existingRefreshToken.userId} count=${revokedSessionCount}`,
      );
      throw this.buildInvalidRefreshTokenError();
    }

    if (existingRefreshToken.expiresAt.getTime() <= Date.now()) {
      console.warn(`refresh_token_rejected reason=expired tokenId=${existingRefreshToken.id}`);
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

    console.info(`refresh_token_rotation_success userId=${refreshResult.userId}`);

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
        console.info(`logout_token_revoked userId=${context.userId} tokenId=${refreshToken.id}`);
      }
    });

    console.info(`logout_success userId=${context.userId}`);
  }

  public async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    console.info(`forgot_password_requested email=${input.email}`);

    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      console.info(`forgot_password_unknown_email email=${input.email}`);
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

    console.info(`password_reset_email_sent email=${user.email}`);
  }

  public async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = tokenUtility.hashToken(input.token);

    const resetResult = await AppDataSource.transaction(async (manager) => {
      const passwordResetToken = await passwordResetTokenRepository.findByTokenHash(tokenHash, manager);

      if (!passwordResetToken) {
        console.warn('password_reset_token_invalid reason=not_found');
        throw this.buildInvalidPasswordResetTokenError();
      }

      if (passwordResetToken.usedAt) {
        console.warn(`password_reset_token_invalid reason=used tokenId=${passwordResetToken.id}`);
        throw this.buildInvalidPasswordResetTokenError();
      }

      if (passwordResetToken.expiresAt.getTime() <= Date.now()) {
        console.warn(`password_reset_token_expired tokenId=${passwordResetToken.id}`);
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

    console.info(
      `password_reset_refresh_tokens_revoked userId=${resetResult.userId} count=${resetResult.revokedRefreshTokenCount}`,
    );
    console.info(`password_reset_success userId=${resetResult.userId}`);
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
