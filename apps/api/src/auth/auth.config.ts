import { DEFAULT_SESSION_TTL_SECONDS } from './auth.constants';

export interface AuthConfig {
  passwordHash: string;
  jwtSecret: string;
  sessionTtlSeconds: number;
  cookieSecure: boolean;
}

function requireValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少必要环境变量 ${name}`);
  }
  return value;
}

function parsePositiveInteger(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`环境变量 ${name} 必须是正整数`);
  }
  return value;
}

function requireBoolean(name: string) {
  const raw = requireValue(name).toLowerCase();
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  throw new Error(`环境变量 ${name} 必须是 true 或 false`);
}

export function getAuthConfig(): AuthConfig {
  const passwordHash = requireValue('ADMIN_PASSWORD_HASH');
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash)) {
    throw new Error('环境变量 ADMIN_PASSWORD_HASH 必须是有效的 bcrypt 哈希');
  }

  const jwtSecret = requireValue('AUTH_JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('环境变量 AUTH_JWT_SECRET 至少需要 32 个字符');
  }

  return {
    passwordHash,
    jwtSecret,
    sessionTtlSeconds: parsePositiveInteger('AUTH_SESSION_TTL_SECONDS', DEFAULT_SESSION_TTL_SECONDS),
    cookieSecure: requireBoolean('AUTH_COOKIE_SECURE')
  };
}

export function getCorsOrigins() {
  const origins = requireValue('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('环境变量 CORS_ORIGIN 至少需要一个明确来源');
  }
  return origins;
}
