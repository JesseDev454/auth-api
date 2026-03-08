import { User } from '../../entities/User';
import { roleRepository } from '../../repositories/role.repository';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../utils/appError';

interface ListUsersInput {
  page: number;
  limit: number;
}

interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

interface UpdateUserRoleInput {
  adminUserId: string;
  targetUserId: string;
  role: 'admin' | 'user';
}

export class AdminService {
  public getPlaceholderMessage(): string {
    return 'Admin route placeholder';
  }

  public async listUsers(
    adminUserId: string,
    input: ListUsersInput,
  ): Promise<{
    users: AdminUserListItem[];
    pagination: { page: number; limit: number; total: number };
  }> {
    const result = await userRepository.listUsersPaginated(input);

    console.info(
      `admin_users_listed adminUserId=${adminUserId} page=${input.page} limit=${input.limit} total=${result.total}`,
    );

    return {
      users: result.users.map((user) => this.toAdminUserListItem(user)),
      pagination: {
        page: input.page,
        limit: input.limit,
        total: result.total,
      },
    };
  }

  public async updateUserRole(
    input: UpdateUserRoleInput,
  ): Promise<{ user: { id: string; role: string } }> {
    const targetUser = await userRepository.findById(input.targetUserId);

    if (!targetUser) {
      console.warn(
        `admin_role_update_attempt_failed adminUserId=${input.adminUserId} targetUserId=${input.targetUserId} reason=user_not_found`,
      );
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    if (input.adminUserId === input.targetUserId && input.role === 'user') {
      console.warn(
        `admin_role_update_attempt_failed adminUserId=${input.adminUserId} targetUserId=${input.targetUserId} reason=cannot_remove_own_admin_role`,
      );
      throw new AppError(403, 'FORBIDDEN', 'You cannot remove your own admin role.', {
        reason: 'CANNOT_REMOVE_OWN_ADMIN_ROLE',
      });
    }

    const targetRole = await roleRepository.findByName(input.role);

    if (!targetRole) {
      console.warn(
        `admin_role_update_attempt_failed adminUserId=${input.adminUserId} targetUserId=${input.targetUserId} reason=role_not_configured`,
      );
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'The requested role is not configured.');
    }

    const updatedUser = await userRepository.updateUserRole(targetUser.id, targetRole.id);

    if (!updatedUser) {
      console.warn(
        `admin_role_update_attempt_failed adminUserId=${input.adminUserId} targetUserId=${input.targetUserId} reason=user_not_found_after_update`,
      );
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    console.info(
      `admin_role_updated adminUserId=${input.adminUserId} targetUserId=${updatedUser.id} role=${updatedUser.role.name}`,
    );

    return {
      user: {
        id: updatedUser.id,
        role: updatedUser.role.name,
      },
    };
  }

  private toAdminUserListItem(user: User): AdminUserListItem {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

export const adminService = new AdminService();
