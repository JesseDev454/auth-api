import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
  dotenv.config({ path: '.env.test.local', override: true });
}

type NodeEnv = 'development' | 'test' | 'production';

const getOptionalStringEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();

  if (!value) {
    return undefined;
  }

  return value;
};

const getStringEnv = (name: string, fallback?: string): string => {
  const value = getOptionalStringEnv(name) ?? fallback;

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

const getDatabaseConfig = () => {
  const databaseUrl = getOptionalStringEnv('DATABASE_URL');

  if (!databaseUrl) {
    return {
      url: undefined,
      host: getStringEnv('DB_HOST'),
      port: getNumberEnv('DB_PORT', '5432'),
      username: getStringEnv('DB_USER'),
      password: getStringEnv('DB_PASSWORD'),
      database: getStringEnv('DB_NAME'),
    };
  }

  const parsedDatabaseUrl = new URL(databaseUrl);
  const databaseName = parsedDatabaseUrl.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  return {
    url: databaseUrl,
    host: parsedDatabaseUrl.hostname,
    port: Number(parsedDatabaseUrl.port || '5432'),
    username: decodeURIComponent(parsedDatabaseUrl.username),
    password: decodeURIComponent(parsedDatabaseUrl.password),
    database: databaseName,
  };
};

export const env = {
  port: getNumberEnv('PORT', '4000'),
  nodeEnv: getStringEnv('NODE_ENV', 'development') as NodeEnv,
  db: getDatabaseConfig(),
  appBaseUrl: getStringEnv('APP_BASE_URL', 'https://yourapp.com'),
  logLevel: getStringEnv(
    'LOG_LEVEL',
    process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ),
  jwt: {
    accessSecret: getStringEnv('JWT_ACCESS_SECRET'),
    refreshSecret: getStringEnv('JWT_REFRESH_SECRET'),
  },
} as const;
