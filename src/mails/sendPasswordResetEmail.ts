import { env } from '../config/env';

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

  console.info(`Password reset email sent to ${user.email}: ${resetLink}`);
  console.info(body);
};
