import { User } from '../../entities/User';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../utils/appError';

interface UserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserService {
  public getPlaceholderMessage(): string {
    return 'Users route placeholder';
  }

  public async getMe(userId: string): Promise<{ user: UserProfileResponse }> {
    console.info(`Protected profile access for user ${userId}`);

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    return {
      user: this.toUserProfileResponse(user),
    };
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
