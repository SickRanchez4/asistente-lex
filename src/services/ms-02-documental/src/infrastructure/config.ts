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
  ms01Url: string;
  ms01ApiToken: string;
  fileTransferTimeoutMs: number;
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
    ms01Url: env.MS01_URL ?? 'http://ms-01-juridico:8081',
    ms01ApiToken: env.MS01_API_TOKEN ?? '',
    fileTransferTimeoutMs: Number(env.FILE_TRANSFER_TIMEOUT_MS ?? 60000),
  };
}
