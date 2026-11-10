export type ServiceName = 'ms-01-juridico' | 'ms-02-documental' | 'ms-03-erp' | 'ms-04-ia';

export interface ServiceTarget {
  name: ServiceName;
  url: string;
  // Credencial propia del servicio receptor; vacía bloquea las llamadas internas.
  apiToken: string;
}

export interface GatewayConfig {
  cookieSecure: boolean;
  port: number;
  serviceTimeoutMs: number;
  restTimeoutMs: number;
  aiBudgetMs: number;
  fileTransferTimeoutMs: number;
  maxRequestBodyBytes: number;
  userContextSigningKey: string;
  corsOrigins: string[];
  services: ServiceTarget[];
}

// Base64 de 10 MiB (13.981.016 caracteres) más margen para el resto del JSON.
const DEFAULT_MAX_REQUEST_BODY_BYTES = 14_680_064;

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} debe ser un entero positivo.`);
  }
  return parsed;
}

export function loadConfig(): GatewayConfig {
  const env = process.env;
  return {
    cookieSecure: env.COOKIE_SECURE === 'true',
    port: positiveInteger(env.PORT, 4000, 'PORT'),
    serviceTimeoutMs: positiveInteger(env.SERVICE_TIMEOUT_MS, 3000, 'SERVICE_TIMEOUT_MS'),
    restTimeoutMs: positiveInteger(env.REST_TIMEOUT_MS, 10_000, 'REST_TIMEOUT_MS'),
    aiBudgetMs: positiveInteger(env.AI_BUDGET_MS, 60_000, 'AI_BUDGET_MS'),
    fileTransferTimeoutMs: positiveInteger(env.FILE_TRANSFER_TIMEOUT_MS, 60_000, 'FILE_TRANSFER_TIMEOUT_MS'),
    maxRequestBodyBytes: positiveInteger(env.MAX_REQUEST_BODY_BYTES, DEFAULT_MAX_REQUEST_BODY_BYTES, 'MAX_REQUEST_BODY_BYTES'),
    userContextSigningKey: env.USER_CONTEXT_SIGNING_KEY ?? '',
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    services: [
      { name: 'ms-01-juridico', url: env.MS01_URL ?? 'http://localhost:8081', apiToken: env.MS01_API_TOKEN ?? '' },
      { name: 'ms-02-documental', url: env.MS02_URL ?? 'http://localhost:8082', apiToken: env.MS02_API_TOKEN ?? '' },
      { name: 'ms-03-erp', url: env.MS03_URL ?? 'http://localhost:8083', apiToken: env.MS03_API_TOKEN ?? '' },
      { name: 'ms-04-ia', url: env.MS04_URL ?? 'http://localhost:8084', apiToken: env.MS04_API_TOKEN ?? '' },
    ],
  };
}
