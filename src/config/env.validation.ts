const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);

function requireValue(config: Record<string, unknown>, key: string): string {
  const value = String(config[key] || '').trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}
function assertHttpUrls(value: string, key: string): void {
  for (const candidate of value.split(',')) {
    const url = new URL(candidate.trim());
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`${key} must contain only HTTP(S) URLs`);
    }
  }
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(config.NODE_ENV || 'development');
  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const mongoKey = nodeEnv === 'test' ? 'MONGODB_TEST_URI' : 'MONGODB_URI';
  requireValue(config, mongoKey);
  const jwtSecret = requireValue(config, 'JWT_SECRET');

  if (nodeEnv === 'production') {
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    assertHttpUrls(requireValue(config, 'FRONTEND_URL'), 'FRONTEND_URL');
    assertHttpUrls(requireValue(config, 'BASE_URL'), 'BASE_URL');
  }

  return config;
}
