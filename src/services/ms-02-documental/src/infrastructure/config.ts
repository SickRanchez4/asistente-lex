export interface ServiceConfig {
  healthCheckTimeoutMs: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    schema: string;
    sslMode: 'disable' | 'verify-full';
    sslRootCert: string;
  };
  fileStoragePath: string;
  internalApiToken: string;
  userContextSigningKey: string;
}

export function loadConfig(): ServiceConfig {
  const env = process.env;
  const sslMode = env.DB_SSLMODE ?? 'verify-full';
  if (sslMode !== 'disable' && sslMode !== 'verify-full') {
    throw new Error('DB_SSLMODE debe ser disable o verify-full.');
  }
  return {
    healthCheckTimeoutMs: Number(env.HEALTH_CHECK_TIMEOUT_MS ?? 2000),
    database: {
      host: env.DB_HOST ?? 'localhost',
      port: Number(env.DB_PORT ?? 5432),
      name: env.DB_NAME ?? 'asistente_lex',
      user: env.DB_USER ?? '',
      password: env.DB_PASSWORD ?? '',
      schema: env.DB_SCHEMA ?? 'documental',
      sslMode,
      sslRootCert: env.DB_SSLROOTCERT ?? '/certs/postgresql-ca.crt',
    },
    fileStoragePath: env.FILE_STORAGE_PATH ?? '',
    internalApiToken: env.INTERNAL_API_TOKEN ?? '',
    userContextSigningKey: env.USER_CONTEXT_SIGNING_KEY ?? '',
  };
}
