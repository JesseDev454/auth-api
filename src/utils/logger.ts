import pino, { DestinationStream, LevelWithSilent } from 'pino';

import { env } from '../config/env';

type StructuredLog = Record<string, unknown>;

const testLogBuffer: StructuredLog[] = [];

const testDestination: DestinationStream = {
  write: (message: string): boolean => {
    const lines = message.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        testLogBuffer.push(JSON.parse(line) as StructuredLog);
      } catch {
        testLogBuffer.push({ message: line });
      }
    }

    return true;
  },
};

const getLogLevel = (): LevelWithSilent => {
  return env.logLevel as LevelWithSilent;
};

const destination = env.nodeEnv === 'test' ? testDestination : undefined;

export const logger = pino(
  {
    level: getLogLevel(),
    base: {
      service: 'auth-api',
      environment: env.nodeEnv,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  destination,
);

export const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
};

export const getBufferedTestLogs = (): StructuredLog[] => {
  return [...testLogBuffer];
};

export const clearBufferedTestLogs = (): void => {
  testLogBuffer.length = 0;
};
