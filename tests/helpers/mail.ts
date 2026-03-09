import { getBufferedTestLogs } from '../../src/utils/logger';

type TokenKind = 'verification' | 'reset';

export const getInfoLogCheckpoint = (): number => {
  return getBufferedTestLogs().length;
};

export const extractTokenFromInfoLogs = (kind: TokenKind, checkpoint = 0): string => {
  const logEntries = getBufferedTestLogs().slice(checkpoint);
  const previewEvent = kind === 'verification'
    ? 'verification_email_preview'
    : 'password_reset_email_preview';
  const linkField = kind === 'verification' ? 'verificationLink' : 'resetLink';

  for (const logEntry of logEntries) {
    if (logEntry.event === previewEvent && typeof logEntry[linkField] === 'string') {
      const url = new URL(logEntry[linkField] as string);
      const token = url.searchParams.get('token');

      if (token) {
        return token;
      }
    }
  }

  throw new Error(`Unable to find a ${kind} token in captured console output.`);
};
