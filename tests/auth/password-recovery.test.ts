import { hashUtility } from '../../src/utils/hash';
import { createTestClient } from '../helpers/app';
import {
  expirePasswordResetToken,
  findLatestPasswordResetTokenForUser,
  findPasswordResetTokenByRawToken,
  findUserByEmail,
  listRefreshTokensForUser,
} from '../helpers/database';
import { createAuthenticatedUser, createVerifiedUser, requestPasswordReset } from '../helpers/users';

describe('Password recovery integration', () => {
  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns a generic success response and stores a hashed reset token for known emails', async () => {
      const client = createTestClient();
      const { payload, user } = await createVerifiedUser(client);

      const { response, resetToken } = await requestPasswordReset(client, payload.email);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        'If an account with that email exists, a password reset email has been sent',
      );
      expect(resetToken).toEqual(expect.any(String));

      const storedToken = await findLatestPasswordResetTokenForUser(user.id);

      expect(storedToken).not.toBeNull();
      expect(storedToken?.tokenHash).not.toBe(resetToken);
      expect(storedToken?.tokenHash).toBe(
        (await findPasswordResetTokenByRawToken(resetToken!))?.tokenHash,
      );
    });

    it('returns the same generic response for unknown emails', async () => {
      const client = createTestClient();

      const { response, resetToken } = await requestPasswordReset(client, 'missing@example.com');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        'If an account with that email exists, a password reset email has been sent',
      );
      expect(resetToken).toBeNull();
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('resets the password, marks the token used, and revokes active refresh tokens', async () => {
      const client = createTestClient();
      const authenticatedUser = await createAuthenticatedUser(client);
      const oldPassword = authenticatedUser.payload.password;
      const newPassword = 'NewStrongPassword123!';

      const { resetToken } = await requestPasswordReset(client, authenticatedUser.payload.email);

      const response = await client.post('/api/v1/auth/reset-password').send({
        token: resetToken,
        newPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successful');

      const updatedUser = await findUserByEmail(authenticatedUser.payload.email);
      const storedResetToken = await findPasswordResetTokenByRawToken(resetToken!);
      const refreshTokens = await listRefreshTokensForUser(authenticatedUser.user.id);

      await expect(hashUtility.comparePassword(newPassword, updatedUser!.passwordHash)).resolves.toBe(
        true,
      );
      await expect(hashUtility.comparePassword(oldPassword, updatedUser!.passwordHash)).resolves.toBe(
        false,
      );
      expect(storedResetToken?.usedAt).not.toBeNull();
      expect(refreshTokens.every((token) => token.revokedAt)).toBe(true);

      const refreshResponse = await client.post('/api/v1/auth/refresh').send({
        refreshToken: authenticatedUser.refreshToken,
      });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');

      const oldLoginResponse = await client.post('/api/v1/auth/login').send({
        email: authenticatedUser.payload.email,
        password: oldPassword,
      });
      const newLoginResponse = await client.post('/api/v1/auth/login').send({
        email: authenticatedUser.payload.email,
        password: newPassword,
      });

      expect(oldLoginResponse.status).toBe(401);
      expect(oldLoginResponse.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(newLoginResponse.status).toBe(200);
    });

    it('rejects invalid reset tokens', async () => {
      const client = createTestClient();

      const response = await client.post('/api/v1/auth/reset-password').send({
        token: 'invalid-reset-token',
        newPassword: 'NewStrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_PASSWORD_RESET_TOKEN');
    });

    it('rejects expired reset tokens', async () => {
      const client = createTestClient();
      const { payload, user } = await createVerifiedUser(client);
      const { resetToken } = await requestPasswordReset(client, payload.email);
      const storedResetToken = await findLatestPasswordResetTokenForUser(user.id);

      await expirePasswordResetToken(storedResetToken!.id);

      const response = await client.post('/api/v1/auth/reset-password').send({
        token: resetToken,
        newPassword: 'NewStrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_PASSWORD_RESET_TOKEN');
    });

    it('rejects used reset tokens', async () => {
      const client = createTestClient();
      const { payload } = await createVerifiedUser(client);
      const { resetToken } = await requestPasswordReset(client, payload.email);

      await client.post('/api/v1/auth/reset-password').send({
        token: resetToken,
        newPassword: 'NewStrongPassword123!',
      });

      const secondResponse = await client.post('/api/v1/auth/reset-password').send({
        token: resetToken,
        newPassword: 'AnotherStrongPassword123!',
      });

      expect(secondResponse.status).toBe(401);
      expect(secondResponse.body.error.code).toBe('INVALID_PASSWORD_RESET_TOKEN');
    });
  });
});
