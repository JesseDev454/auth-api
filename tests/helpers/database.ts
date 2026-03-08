import { AppDataSource } from '../../src/config/database';
import { EmailVerificationToken } from '../../src/entities/EmailVerificationToken';
import { PasswordResetToken } from '../../src/entities/PasswordResetToken';
import { RefreshToken } from '../../src/entities/RefreshToken';
import { Role } from '../../src/entities/Role';
import { User } from '../../src/entities/User';
import { tokenUtility } from '../../src/utils/token';

const getUserRepository = () => AppDataSource.getRepository(User);
const getRoleRepository = () => AppDataSource.getRepository(Role);
const getRefreshTokenRepository = () => AppDataSource.getRepository(RefreshToken);
const getVerificationTokenRepository = () => AppDataSource.getRepository(EmailVerificationToken);
const getPasswordResetTokenRepository = () => AppDataSource.getRepository(PasswordResetToken);

export const findUserByEmail = (email: string): Promise<User | null> => {
  return getUserRepository().findOne({
    where: { email },
    relations: { role: true },
    withDeleted: true,
  });
};

export const findUserById = (id: string): Promise<User | null> => {
  return getUserRepository().findOne({
    where: { id },
    relations: { role: true },
    withDeleted: true,
  });
};

export const findRoleByName = (name: 'user' | 'admin'): Promise<Role | null> => {
  return getRoleRepository().findOne({
    where: { name },
  });
};

export const setUserRole = async (
  userId: string,
  roleName: 'user' | 'admin',
): Promise<User | null> => {
  const role = await findRoleByName(roleName);

  if (!role) {
    throw new Error(`Role ${roleName} not found in test database.`);
  }

  await getUserRepository().update({ id: userId }, { roleId: role.id });

  return findUserById(userId);
};

export const findLatestVerificationTokenForUser = (
  userId: string,
): Promise<EmailVerificationToken | null> => {
  return getVerificationTokenRepository().findOne({
    where: { userId },
    order: { createdAt: 'DESC' },
  });
};

export const expireVerificationToken = async (tokenId: string): Promise<void> => {
  await getVerificationTokenRepository().update(
    { id: tokenId },
    { expiresAt: new Date(Date.now() - 60_000) },
  );
};

export const findPasswordResetTokenByRawToken = (
  rawToken: string,
): Promise<PasswordResetToken | null> => {
  return getPasswordResetTokenRepository().findOne({
    where: { tokenHash: tokenUtility.hashToken(rawToken) },
  });
};

export const findLatestPasswordResetTokenForUser = (
  userId: string,
): Promise<PasswordResetToken | null> => {
  return getPasswordResetTokenRepository().findOne({
    where: { userId },
    order: { createdAt: 'DESC' },
  });
};

export const expirePasswordResetToken = async (tokenId: string): Promise<void> => {
  await getPasswordResetTokenRepository().update(
    { id: tokenId },
    { expiresAt: new Date(Date.now() - 60_000) },
  );
};

export const findRefreshTokenByRawToken = (rawToken: string): Promise<RefreshToken | null> => {
  return getRefreshTokenRepository().findOne({
    where: { tokenHash: tokenUtility.hashToken(rawToken) },
  });
};

export const listRefreshTokensForUser = (userId: string): Promise<RefreshToken[]> => {
  return getRefreshTokenRepository().find({
    where: { userId },
    order: { createdAt: 'DESC' },
  });
};

export const expireRefreshToken = async (tokenId: string): Promise<void> => {
  await getRefreshTokenRepository().update(
    { id: tokenId },
    { expiresAt: new Date(Date.now() - 60_000) },
  );
};
