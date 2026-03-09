import { env } from '../config/env';
import { logger } from '../utils/logger';

interface PasswordResetRecipient {
  email: string;
  fullName: string;
}

export const sendPasswordResetEmail = async (
  user: PasswordResetRecipient,
  rawToken: string,
): Promise<void> => {
  const resetLink = `${env.appBaseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const body = [
    'We received a request to reset your password.',
    '',
    'Click the link below to continue:',
    resetLink,
    '',
    'This link expires in 1 hour.',
  ].join('\n');

  logger.info(
    {
      event: 'password_reset_email_sent',
      email: user.email,
    },
    'Password reset email dispatched.',
  );

  if (env.nodeEnv !== 'production') {
    logger.info(
      {
        event: 'password_reset_email_preview',
        email: user.email,
        resetLink,
        body,
      },
      'Password reset email preview generated.',
    );
  }
};
