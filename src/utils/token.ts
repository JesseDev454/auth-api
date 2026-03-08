import crypto from 'node:crypto';

const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export const tokenUtility = {
  generateOpaqueToken(size = EMAIL_VERIFICATION_TOKEN_BYTES): string {
    return crypto.randomBytes(size).toString('hex');
  },
  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  },
  buildEmailVerificationToken(): {
    rawToken: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const rawToken = this.generateOpaqueToken();

    return {
      rawToken,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    };
  },
};
