import crypto from 'node:crypto';

import { findUserByEmail, setUserRole } from './database';
import { extractTokenFromInfoLogs, getInfoLogCheckpoint } from './mail';

interface TestUserOverrides {
  fullName?: string;
  email?: string;
  password?: string;
  role?: 'user' | 'admin';
}

interface RequestLike {
  post(path: string): {
    send(body: unknown): Promise<{
      status: number;
      body: Record<string, any>;
    }>;
  };
}

export const buildUserPayload = (overrides: TestUserOverrides = {}) => {
  const uniqueEmail = `test.${crypto.randomUUID()}@example.com`;

  return {
    fullName: overrides.fullName ?? 'Test User',
    email: overrides.email ?? uniqueEmail,
    password: overrides.password ?? 'StrongPassword123!',
  };
};

export const registerUser = async (
  client: RequestLike,
  overrides: TestUserOverrides = {},
) => {
  const payload = buildUserPayload(overrides);
  const response = await client.post('/api/v1/auth/register').send(payload);

  return {
    payload,
    response,
  };
};

export const registerAndCaptureVerificationToken = async (
  client: RequestLike,
  overrides: TestUserOverrides = {},
) => {
  const checkpoint = getInfoLogCheckpoint();
  const registration = await registerUser(client, overrides);
  const verificationToken = extractTokenFromInfoLogs('verification', checkpoint);

  return {
    ...registration,
    verificationToken,
  };
};

export const verifyUserEmail = async (client: RequestLike, token: string) => {
  return client.post('/api/v1/auth/verify-email').send({ token });
};

export const createVerifiedUser = async (
  client: RequestLike,
  overrides: TestUserOverrides = {},
) => {
  const registration = await registerAndCaptureVerificationToken(client, overrides);
  const verifyResponse = await verifyUserEmail(client, registration.verificationToken);

  let user = await findUserByEmail(registration.payload.email);

  if (!user) {
    throw new Error(`Expected user ${registration.payload.email} to exist after verification.`);
  }

  if (overrides.role && overrides.role !== 'user') {
    user = await setUserRole(user.id, overrides.role);
  }

  if (!user) {
    throw new Error(`Expected user ${registration.payload.email} to exist after role update.`);
  }

  return {
    ...registration,
    verifyResponse,
    user,
  };
};

export const loginUser = async (
  client: RequestLike,
  credentials: { email: string; password: string },
) => {
  return client.post('/api/v1/auth/login').send(credentials);
};

export const createAuthenticatedUser = async (
  client: RequestLike,
  overrides: TestUserOverrides = {},
) => {
  const verifiedUser = await createVerifiedUser(client, overrides);
  const loginResponse = await loginUser(client, {
    email: verifiedUser.payload.email,
    password: verifiedUser.payload.password,
  });

  return {
    ...verifiedUser,
    loginResponse,
    accessToken: loginResponse.body.data.tokens.accessToken as string,
    refreshToken: loginResponse.body.data.tokens.refreshToken as string,
  };
};

export const requestPasswordReset = async (client: RequestLike, email: string) => {
  const checkpoint = getInfoLogCheckpoint();
  const response = await client.post('/api/v1/auth/forgot-password').send({ email });
  let resetToken: string | null = null;

  try {
    resetToken = extractTokenFromInfoLogs('reset', checkpoint);
  } catch {
    resetToken = null;
  }

  return {
    response,
    resetToken,
  };
};
