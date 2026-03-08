import { User } from '../../entities/User';
import { AppDataSource } from '../../config/database';
import { sendVerificationEmail } from '../../mails/sendVerificationEmail';
import { emailVerificationTokenRepository } from '../../repositories/emailVerificationToken.repository';
import { roleRepository } from '../../repositories/role.repository';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../utils/appError';
import { hashUtility } from '../../utils/hash';
import { tokenUtility } from '../../utils/token';

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

interface AuthUserResponse {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
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

  private toAuthUserResponse(user: User): AuthUserResponse {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      isEmailVerified: user.isEmailVerified,
    };
  }
}

export const authService = new AuthService();
