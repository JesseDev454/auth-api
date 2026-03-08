type TokenKind = 'verification' | 'reset';

const TOKEN_PATTERNS: Record<TokenKind, RegExp> = {
  verification: /verify-email\?token=([^&\s]+)/,
  reset: /reset-password\?token=([^&\s]+)/,
};

const getConsoleInfoMock = (): jest.MockedFunction<typeof console.info> => {
  return console.info as jest.MockedFunction<typeof console.info>;
};

const stringifyLogArgument = (argument: unknown): string => {
  if (typeof argument === 'string') {
    return argument;
  }

  return JSON.stringify(argument);
};

export const getInfoLogCheckpoint = (): number => {
  return getConsoleInfoMock().mock.calls.length;
};

export const extractTokenFromInfoLogs = (kind: TokenKind, checkpoint = 0): string => {
  const pattern = TOKEN_PATTERNS[kind];
  const logEntries = getConsoleInfoMock().mock.calls.slice(checkpoint);

  for (const logEntry of logEntries) {
    const renderedLogEntry = logEntry.map((argument) => stringifyLogArgument(argument)).join(' ');
    const match = renderedLogEntry.match(pattern);

    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  throw new Error(`Unable to find a ${kind} token in captured console output.`);
};
