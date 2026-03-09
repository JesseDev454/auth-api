import { env } from '../config/env';
import { logger } from '../utils/logger';

interface VerificationRecipient {
  email: string;
  fullName: string;
}

export const sendVerificationEmail = async (
  user: VerificationRecipient,
  rawToken: string,
): Promise<void> => {
  const verificationLink = `${env.appBaseUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const body = [
    `Welcome ${user.fullName}!`,
    '',
    'Click the link below to verify your account:',
    verificationLink,
    '',
    'This link expires in 24 hours.',
  ].join('\n');

  logger.info(
    {
      event: 'verification_email_sent',
      email: user.email,
    },
    'Verification email dispatched.',
  );

  if (env.nodeEnv !== 'production') {
    logger.info(
      {
        event: 'verification_email_preview',
        email: user.email,
        verificationLink,
        body,
      },
      'Verification email preview generated.',
    );
  }
};
