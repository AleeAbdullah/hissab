const DEVELOPMENT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/hissab';
const DEVELOPMENT_ACCESS_SECRET = 'development-only-access-secret-change-me';
const DEVELOPMENT_TOKEN_HASH_SECRET =
  'development-only-token-hash-secret-change-me';
const DEVELOPMENT_IDEMPOTENCY_HMAC_SECRET =
  'development-only-idempotency-hmac-change-me';
const DEVELOPMENT_IDEMPOTENCY_ENCRYPTION_KEY =
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export interface EnvironmentVariables extends Record<string, unknown> {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL: string;
  DATABASE_SSL: boolean;
  DATABASE_POOL_MAX: number;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_SECONDS: number;
  PASSWORD_RESET_TTL_SECONDS: number;
  TOKEN_HASH_SECRET: string;
  IDEMPOTENCY_HMAC_SECRET: string;
  IDEMPOTENCY_ENCRYPTION_KEY: string;
  IDEMPOTENCY_TTL_SECONDS: number;
  OUTBOX_POLL_INTERVAL_MS: number;
  OUTBOX_BATCH_SIZE: number;
  OUTBOX_LEASE_SECONDS: number;
  OUTBOX_MAX_ATTEMPTS: number;
  OUTBOX_ENABLED: boolean;
  EXPO_PUSH_ENABLED: boolean;
  EXPO_PUSH_ACCESS_TOKEN?: string;
  EXPO_PUSH_SEND_URL: string;
  EXPO_PUSH_RECEIPTS_URL: string;
  SWAGGER_ENABLED: boolean;
}

function parseInteger(
  name: string,
  value: unknown,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? defaultValue);

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}.`,
    );
  }

  return parsed;
}

function parseBoolean(
  name: string,
  value: unknown,
  defaultValue: boolean,
): boolean {
  const parsed = value ?? defaultValue;

  if (typeof parsed === 'boolean') {
    return parsed;
  }

  if (parsed === 'true') {
    return true;
  }

  if (parsed === 'false') {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

function parseString(
  name: string,
  value: unknown,
  defaultValue?: string,
): string {
  const parsed = value ?? defaultValue;

  if (typeof parsed !== 'string' || parsed.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return parsed;
}

function parseNodeEnvironment(value: unknown): NodeEnvironment {
  const nodeEnvironment = value ?? 'development';

  if (
    typeof nodeEnvironment !== 'string' ||
    !NODE_ENVIRONMENTS.includes(nodeEnvironment as NodeEnvironment)
  ) {
    throw new Error(
      `NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}.`,
    );
  }

  return nodeEnvironment as NodeEnvironment;
}

function parseDatabaseUrl(
  value: unknown,
  nodeEnvironment: NodeEnvironment,
): string {
  const databaseUrl =
    value ??
    (nodeEnvironment === 'development' ? DEVELOPMENT_DATABASE_URL : undefined);

  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL is required outside development.');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql scheme.');
  }

  return databaseUrl;
}

function parseProductionSecret(
  name: string,
  value: unknown,
  nodeEnvironment: NodeEnvironment,
  developmentDefault: string,
): string {
  const secret =
    value ??
    (nodeEnvironment === 'development' ? developmentDefault : undefined);
  const parsed = parseString(name, secret);

  if (parsed.length < 32) {
    throw new Error(`${name} must contain at least 32 characters.`);
  }

  return parsed;
}

function parseEncryptionKey(
  value: unknown,
  nodeEnvironment: NodeEnvironment,
): string {
  const encoded = parseProductionSecret(
    'IDEMPOTENCY_ENCRYPTION_KEY',
    value,
    nodeEnvironment,
    DEVELOPMENT_IDEMPOTENCY_ENCRYPTION_KEY,
  );

  if (Buffer.from(encoded, 'base64').length !== 32) {
    throw new Error(
      'IDEMPOTENCY_ENCRYPTION_KEY must be a base64-encoded 32-byte key.',
    );
  }

  return encoded;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const nodeEnvironment = parseNodeEnvironment(config.NODE_ENV);

  return {
    ...config,
    NODE_ENV: nodeEnvironment,
    PORT: parseInteger('PORT', config.PORT, 3000, 1, 65_535),
    DATABASE_URL: parseDatabaseUrl(config.DATABASE_URL, nodeEnvironment),
    DATABASE_SSL: parseBoolean('DATABASE_SSL', config.DATABASE_SSL, false),
    DATABASE_POOL_MAX: parseInteger(
      'DATABASE_POOL_MAX',
      config.DATABASE_POOL_MAX,
      10,
      1,
      100,
    ),
    JWT_ISSUER: parseString('JWT_ISSUER', config.JWT_ISSUER, 'hissab-api'),
    JWT_AUDIENCE: parseString(
      'JWT_AUDIENCE',
      config.JWT_AUDIENCE,
      'hissab-mobile',
    ),
    JWT_ACCESS_SECRET: parseProductionSecret(
      'JWT_ACCESS_SECRET',
      config.JWT_ACCESS_SECRET,
      nodeEnvironment,
      DEVELOPMENT_ACCESS_SECRET,
    ),
    JWT_ACCESS_TTL_SECONDS: parseInteger(
      'JWT_ACCESS_TTL_SECONDS',
      config.JWT_ACCESS_TTL_SECONDS,
      900,
      60,
      86_400,
    ),
    REFRESH_TOKEN_TTL_SECONDS: parseInteger(
      'REFRESH_TOKEN_TTL_SECONDS',
      config.REFRESH_TOKEN_TTL_SECONDS,
      2_592_000,
      300,
      31_536_000,
    ),
    PASSWORD_RESET_TTL_SECONDS: parseInteger(
      'PASSWORD_RESET_TTL_SECONDS',
      config.PASSWORD_RESET_TTL_SECONDS,
      3600,
      300,
      86_400,
    ),
    TOKEN_HASH_SECRET: parseProductionSecret(
      'TOKEN_HASH_SECRET',
      config.TOKEN_HASH_SECRET,
      nodeEnvironment,
      DEVELOPMENT_TOKEN_HASH_SECRET,
    ),
    IDEMPOTENCY_HMAC_SECRET: parseProductionSecret(
      'IDEMPOTENCY_HMAC_SECRET',
      config.IDEMPOTENCY_HMAC_SECRET,
      nodeEnvironment,
      DEVELOPMENT_IDEMPOTENCY_HMAC_SECRET,
    ),
    IDEMPOTENCY_ENCRYPTION_KEY: parseEncryptionKey(
      config.IDEMPOTENCY_ENCRYPTION_KEY,
      nodeEnvironment,
    ),
    IDEMPOTENCY_TTL_SECONDS: parseInteger(
      'IDEMPOTENCY_TTL_SECONDS',
      config.IDEMPOTENCY_TTL_SECONDS,
      86_400,
      60,
      2_592_000,
    ),
    OUTBOX_POLL_INTERVAL_MS: parseInteger(
      'OUTBOX_POLL_INTERVAL_MS',
      config.OUTBOX_POLL_INTERVAL_MS,
      1000,
      100,
      60_000,
    ),
    OUTBOX_BATCH_SIZE: parseInteger(
      'OUTBOX_BATCH_SIZE',
      config.OUTBOX_BATCH_SIZE,
      20,
      1,
      500,
    ),
    OUTBOX_LEASE_SECONDS: parseInteger(
      'OUTBOX_LEASE_SECONDS',
      config.OUTBOX_LEASE_SECONDS,
      300,
      10,
      3600,
    ),
    OUTBOX_MAX_ATTEMPTS: parseInteger(
      'OUTBOX_MAX_ATTEMPTS',
      config.OUTBOX_MAX_ATTEMPTS,
      10,
      1,
      100,
    ),
    OUTBOX_ENABLED: parseBoolean(
      'OUTBOX_ENABLED',
      config.OUTBOX_ENABLED,
      false,
    ),
    EXPO_PUSH_ENABLED: parseBoolean(
      'EXPO_PUSH_ENABLED',
      config.EXPO_PUSH_ENABLED,
      false,
    ),
    EXPO_PUSH_ACCESS_TOKEN:
      config.EXPO_PUSH_ACCESS_TOKEN === undefined ||
      config.EXPO_PUSH_ACCESS_TOKEN === ''
        ? undefined
        : parseString('EXPO_PUSH_ACCESS_TOKEN', config.EXPO_PUSH_ACCESS_TOKEN),
    EXPO_PUSH_SEND_URL: parseString(
      'EXPO_PUSH_SEND_URL',
      config.EXPO_PUSH_SEND_URL,
      'https://exp.host/--/api/v2/push/send',
    ),
    EXPO_PUSH_RECEIPTS_URL: parseString(
      'EXPO_PUSH_RECEIPTS_URL',
      config.EXPO_PUSH_RECEIPTS_URL,
      'https://exp.host/--/api/v2/push/getReceipts',
    ),
    SWAGGER_ENABLED: parseBoolean(
      'SWAGGER_ENABLED',
      config.SWAGGER_ENABLED,
      nodeEnvironment !== 'production',
    ),
  };
}
