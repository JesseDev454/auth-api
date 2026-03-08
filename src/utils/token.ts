import crypto from 'node:crypto';

import { hashUtility } from './hash';

const DEFAULT_TOKEN_BYTES = 32;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;
const REFRESH_TOKEN_TTL_DAYS = 7;

type ExpiryUnit = 'hours' | 'days';

export const EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_SECONDS =
  EMAIL_VERIFICATION_TTL_HOURS * 60 * 60;
export const PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS = PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60;
export const REFRESH_TOKEN_EXPIRES_IN_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

const generateOpaqueToken = (size = DEFAULT_TOKEN_BYTES): string => {
  return crypto.randomBytes(size).toString('hex');
};

const generateTokenExpiry = (amount: number, unit: ExpiryUnit): Date => {
  const multiplier = unit === 'days' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

  return new Date(Date.now() + amount * multiplier);
};

const hashToken = (rawToken: string): string => {
  return hashUtility.hashValue(rawToken);
};

const buildEmailVerificationToken = (): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} => {
  const rawToken = generateOpaqueToken();

  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: generateTokenExpiry(EMAIL_VERIFICATION_TTL_HOURS, 'hours'),
  };
};

const buildPasswordResetToken = (): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} => {
  const rawToken = generateOpaqueToken();

  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: generateTokenExpiry(PASSWORD_RESET_TOKEN_TTL_HOURS, 'hours'),
  };
};

const generateRefreshToken = (size = DEFAULT_TOKEN_BYTES): string => {
  return generateOpaqueToken(size);
};

const buildRefreshToken = (): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} => {
  const rawToken = generateRefreshToken();

  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: generateTokenExpiry(REFRESH_TOKEN_TTL_DAYS, 'days'),
  };
};

export const tokenUtility = {
  generateOpaqueToken,
  generateRefreshToken,
  generateTokenExpiry,
  hashToken,
  buildEmailVerificationToken,
  buildPasswordResetToken,
  buildRefreshToken,
};
