import { User } from '../../entities/User';
import { AppDataSource } from '../../config/database';
import { sendVerificationEmail } from '../../mails/sendVerificationEmail';
import { emailVerificationTokenRepository } from '../../repositories/emailVerificationToken.repository';
import { refreshTokenRepository } from '../../repositories/refreshToken.repository';
import { roleRepository } from '../../repositories/role.repository';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../utils/appError';
import { hashUtility } from '../../utils/hash';
import { ACCESS_TOKEN_EXPIRES_IN_SECONDS, jwtUtility } from '../../utils/jwt';
import { REFRESH_TOKEN_EXPIRES_IN_SECONDS, tokenUtility } from '../../utils/token';

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

interface LoginContext {
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
  accessTokenExpiresIn: number;
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

  public async refresh(input: RefreshInput): Promise<RefreshResponse> {
    console.info('refresh_token_attempt');

    const tokenHash = tokenUtility.hashToken(input.refreshToken);

    const refreshResult = await AppDataSource.transaction(async (manager) => {
      const refreshToken = await refreshTokenRepository.findByTokenHash(tokenHash, manager);

      if (!refreshToken) {
        console.warn('refresh_token_rejected reason=not_found');
        throw this.buildInvalidRefreshTokenError();
      }

      if (refreshToken.revokedAt) {
        console.warn(`refresh_token_rejected reason=revoked tokenId=${refreshToken.id}`);
        throw this.buildInvalidRefreshTokenError();
      }

      if (refreshToken.expiresAt.getTime() <= Date.now()) {
        console.warn(`refresh_token_rejected reason=expired tokenId=${refreshToken.id}`);
        throw this.buildInvalidRefreshTokenError();
      }

      const user = await userRepository.findById(refreshToken.userId, manager);

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      await refreshTokenRepository.updateLastUsed(refreshToken.id, manager);

      return {
        accessToken: this.signAccessToken(user),
        userId: user.id,
      };
    });

    console.info(`refresh_token_success userId=${refreshResult.userId}`);

    return {
      accessToken: refreshResult.accessToken,
      accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
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
