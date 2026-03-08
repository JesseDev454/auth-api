import { env } from '../config/env';

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

  console.info(`Verification email sent to ${user.email}: ${verificationLink}`);
  console.info(body);
};
