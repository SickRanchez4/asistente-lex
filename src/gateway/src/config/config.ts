export interface ServiceTarget {
  name: string;
  url: string;
}

export interface GatewayConfig {
  port: number;
  serviceTimeoutMs: number;
  corsOrigins: string[];
  services: ServiceTarget[];
}

export function loadConfig(): GatewayConfig {
  const env = process.env;
  return {
    port: Number(env.PORT ?? 4000),
    serviceTimeoutMs: Number(env.SERVICE_TIMEOUT_MS ?? 3000),
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    services: [
      { name: 'ms-01-juridico', url: env.MS01_URL ?? 'http://localhost:8081' },
      { name: 'ms-02-documental', url: env.MS02_URL ?? 'http://localhost:8082' },
      { name: 'ms-03-erp', url: env.MS03_URL ?? 'http://localhost:8083' },
      { name: 'ms-04-ia', url: env.MS04_URL ?? 'http://localhost:8084' },
    ],
  };
}
