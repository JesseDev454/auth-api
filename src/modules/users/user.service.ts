import { User } from '../../entities/User';
import { refreshTokenRepository } from '../../repositories/refreshToken.repository';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';

interface UserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserSessionResponse {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdByIp: string | null;
  userAgent: string | null;
}

export class UserService {
  public getPlaceholderMessage(): string {
    return 'Users route placeholder';
  }

  public async getMe(userId: string): Promise<{ user: UserProfileResponse }> {
    logger.info(
      {
        event: 'protected_profile_access',
        userId,
      },
      'Protected profile accessed.',
    );

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    return {
      user: this.toUserProfileResponse(user),
    };
  }

  public async listSessions(userId: string): Promise<{ sessions: UserSessionResponse[] }> {
    logger.info(
      {
        event: 'session_list_requested',
        userId,
      },
      'Session list requested.',
    );

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const sessions = await refreshTokenRepository.listSessionsForUser(userId);

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt ? session.lastUsedAt.toISOString() : null,
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null,
        createdByIp: session.createdByIp,
        userAgent: session.userAgent,
      })),
    };
  }

  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await refreshTokenRepository.findById(sessionId);

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found.');
    }

    if (session.userId !== userId) {
      logger.warn(
        {
          event: 'session_revoke_forbidden',
          userId,
          sessionId,
          ownerUserId: session.userId,
        },
        'Session revoke forbidden.',
      );
      throw new AppError(403, 'FORBIDDEN', 'Forbidden');
    }

    if (!session.revokedAt) {
      await refreshTokenRepository.revoke(session.id);
    }

    logger.info(
      {
        event: 'session_revoked',
        userId,
        sessionId: session.id,
        alreadyRevoked: Boolean(session.revokedAt),
      },
      'Session revoked.',
    );
  }

  private toUserProfileResponse(user: User): UserProfileResponse {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

export const userService = new UserService();
