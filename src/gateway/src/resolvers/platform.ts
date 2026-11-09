import { fetchServiceStatus } from '../clients/health-client.ts';
import type { GatewayConfig } from '../config/config.ts';

export function createResolvers(config: GatewayConfig) {
  return {
    Query: {
      // Las consultas se lanzan en paralelo: un servicio lento no retrasa a los demás.
      platformStatus: async () => ({
        services: await Promise.all(
          config.services.map(async (service) => ({
            name: service.name,
            status: await fetchServiceStatus(service, config.serviceTimeoutMs),
          })),
        ),
      }),
    },
  };
}
