import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'production';

const getStringEnv = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const getNumberEnv = (name: string, fallback?: string): number => {
  const rawValue = getStringEnv(name, fallback);
  const parsedValue = Number(rawValue);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }

  return parsedValue;
};

export const env = {
  port: getNumberEnv('PORT', '4000'),
  nodeEnv: getStringEnv('NODE_ENV', 'development') as NodeEnv,
  db: {
    host: getStringEnv('DB_HOST'),
    port: getNumberEnv('DB_PORT', '5432'),
    username: getStringEnv('DB_USER'),
    password: getStringEnv('DB_PASSWORD'),
    database: getStringEnv('DB_NAME'),
  },
  jwt: {
    accessSecret: getStringEnv('JWT_ACCESS_SECRET'),
    refreshSecret: getStringEnv('JWT_REFRESH_SECRET'),
  },
} as const;
