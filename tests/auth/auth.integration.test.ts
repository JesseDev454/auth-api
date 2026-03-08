import { hashUtility } from '../../src/utils/hash';
import { createTestClient } from '../helpers/app';
import {
  expireRefreshToken,
  expireVerificationToken,
  findLatestVerificationTokenForUser,
  findRefreshTokenByRawToken,
  findUserByEmail,
  listRefreshTokensForUser,
} from '../helpers/database';
import { createExpiredAccessToken } from '../helpers/tokens';
import {
  createAuthenticatedUser,
  createVerifiedUser,
  registerAndCaptureVerificationToken,
} from '../helpers/users';

describe('Authentication integration', () => {
  describe('POST /api/v1/auth/register', () => {
    it('registers a user and stores a hashed password and verification token', async () => {
      const client = createTestClient();
      const { payload, response } = await registerAndCaptureVerificationToken(client);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Registration successful. Please verify your email.');

      const user = await findUserByEmail(payload.email);

      expect(user).not.toBeNull();
      expect(user?.passwordHash).not.toBe(payload.password);
      await expect(hashUtility.comparePassword(payload.password, user!.passwordHash)).resolves.toBe(
        true,
      );
      expect(user?.isEmailVerified).toBe(false);

      const verificationToken = await findLatestVerificationTokenForUser(user!.id);

      expect(verificationToken).not.toBeNull();
      expect(verificationToken?.usedAt).toBeNull();
    });

    it('rejects duplicate emails', async () => {
      const client = createTestClient();
      const { payload } = await registerAndCaptureVerificationToken(client);

      const duplicateResponse = await client.post('/api/v1/auth/register').send(payload);

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('rejects invalid email input', async () => {
      const client = createTestClient();

      const response = await client.post('/api/v1/auth/register').send({
        fullName: 'Broken Email',
        email: 'not-an-email',
        password: 'StrongPassword123!',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects weak passwords', async () => {
      const client = createTestClient();

      const response = await client.post('/api/v1/auth/register').send({
        fullName: 'Weak Password',
        email: 'weak.password@example.com',
        password: 'short',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('verifies a valid token and marks it used', async () => {
      const client = createTestClient();
      const { payload, verificationToken } = await registerAndCaptureVerificationToken(client);

      const response = await client.post('/api/v1/auth/verify-email').send({
        token: verificationToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email verified successfully');

      const user = await findUserByEmail(payload.email);
      const storedToken = await findLatestVerificationTokenForUser(user!.id);

      expect(user?.isEmailVerified).toBe(true);
      expect(storedToken?.usedAt).not.toBeNull();
    });

    it('rejects invalid verification tokens', async () => {
      const client = createTestClient();

      const response = await client.post('/api/v1/auth/verify-email').send({
        token: 'invalid-token',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('rejects expired verification tokens', async () => {
      const client = createTestClient();
      const { payload, verificationToken } = await registerAndCaptureVerificationToken(client);
      const user = await findUserByEmail(payload.email);
      const storedToken = await findLatestVerificationTokenForUser(user!.id);

      await expireVerificationToken(storedToken!.id);

      const response = await client.post('/api/v1/auth/verify-email').send({
        token: verificationToken,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('rejects used verification tokens', async () => {
      const client = createTestClient();
      const { verificationToken } = await registerAndCaptureVerificationToken(client);

      await client.post('/api/v1/auth/verify-email').send({
        token: verificationToken,
      });

      const secondResponse = await client.post('/api/v1/auth/verify-email').send({
        token: verificationToken,
      });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with correct credentials and returns both tokens', async () => {
      const client = createTestClient();
      const { payload, user } = await createVerifiedUser(client);

      const response = await client.post('/api/v1/auth/login').send({
        email: payload.email,
        password: payload.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
      expect(response.body.data.user.email).toBe(payload.email);

      const storedRefreshToken = await findRefreshTokenByRawToken(
        response.body.data.tokens.refreshToken,
      );
      const refreshedUser = await findUserByEmail(payload.email);

      expect(storedRefreshToken).not.toBeNull();
      expect(storedRefreshToken?.tokenHash).not.toBe(response.body.data.tokens.refreshToken);
      expect(refreshedUser?.lastLoginAt).not.toBeNull();
      expect(user.passwordHash).not.toBe(payload.password);
    });

    it('returns generic invalid credentials for wrong passwords', async () => {
      const client = createTestClient();
      const { payload } = await createVerifiedUser(client);

      const response = await client.post('/api/v1/auth/login').send({
        email: payload.email,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns generic invalid credentials for unknown emails', async () => {
      const client = createTestClient();

      const response = await client.post('/api/v1/auth/login').send({
        email: 'missing.user@example.com',
        password: 'StrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns generic invalid credentials for unverified users', async () => {
      const client = createTestClient();
      const { payload } = await registerAndCaptureVerificationToken(client);

      const response = await client.post('/api/v1/auth/login').send({
        email: payload.email,
        password: payload.password,
      });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates refresh tokens and revokes the old token', async () => {
      const client = createTestClient();
      const authenticatedUser = await createAuthenticatedUser(client);

      const response = await client.post('/api/v1/auth/refresh').send({
        refreshToken: authenticatedUser.refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Tokens refreshed successfully');
      expect(response.body.data.accessToken).toEqual(expect.any(String));
      expect(response.body.data.refreshToken).toEqual(expect.any(String));
      expect(response.body.data.refreshToken).not.toBe(authenticatedUser.refreshToken);

      const oldRefreshToken = await findRefreshTokenByRawToken(authenticatedUser.refreshToken);
      const newRefreshToken = await findRefreshTokenByRawToken(response.body.data.refreshToken);

      expect(oldRefreshToken?.revokedAt).not.toBeNull();
      expect(oldRefreshToken?.lastUsedAt).not.toBeNull();
      expect(newRefreshToken?.revokedAt).toBeNull();
    });

    it('rejects expired refresh tokens', async () => {
      const client = createTestClient();
      const authenticatedUser = await createAuthenticatedUser(client);
      const refreshToken = await findRefreshTokenByRawToken(authenticatedUser.refreshToken);

      await expireRefreshToken(refreshToken!.id);

      const response = await client.post('/api/v1/auth/refresh').send({
        refreshToken: authenticatedUser.refreshToken,
      });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('detects revoked refresh token reuse and revokes all active sessions', async () => {
      const client = createTestClient();
      const authenticatedUser = await createAuthenticatedUser(client);

      const rotationResponse = await client.post('/api/v1/auth/refresh').send({
        refreshToken: authenticatedUser.refreshToken,
      });
      const rotatedRefreshToken = rotationResponse.body.data.refreshToken as string;

      const reuseResponse = await client.post('/api/v1/auth/refresh').send({
        refreshToken: authenticatedUser.refreshToken,
      });

      expect(reuseResponse.status).toBe(401);
      expect(reuseResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');

      const sessions = await listRefreshTokensForUser(authenticatedUser.user.id);
      expect(sessions.every((session) => session.revokedAt)).toBe(true);

      const rotatedReuseResponse = await client.post('/api/v1/auth/refresh').send({
        refreshToken: rotatedRefreshToken,
      });

      expect(rotatedReuseResponse.status).toBe(401);
      expect(rotatedReuseResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('returns the current user for a valid access token', async () => {
      const client = createTestClient();
      const authenticatedUser = await createAuthenticatedUser(client);

      const response = await client
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authenticatedUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe(authenticatedUser.payload.email);
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects requests with no access token', async () => {
      const client = createTestClient();

      const response = await client.get('/api/v1/users/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed access tokens', async () => {
      const client = createTestClient();

      const response = await client
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer definitely-not-a-jwt');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects expired access tokens', async () => {
      const client = createTestClient();
      const authenticatedUser = await createAuthenticatedUser(client);
      const expiredToken = createExpiredAccessToken(authenticatedUser.user.id);

      const response = await client
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
