import type { ServiceTarget } from '../config/config.ts';

export type ServiceStatus = 'UP' | 'DOWN' | 'UNAVAILABLE';

/**
 * Consulta GET /health de un servicio y traduce su respuesta al estado del contrato.
 */
export async function fetchServiceStatus(service: ServiceTarget, timeoutMs: number): Promise<ServiceStatus> {
  try {
    const response = await fetch(`${service.url}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.status === 200) {
      return 'UP';
    }
    if (response.status === 503) {
      return 'DOWN';
    }
    console.warn(`[gateway] ${service.name} respondió con un estado inesperado: ${response.status}`);
    return 'UNAVAILABLE';
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? 'tiempo de espera agotado' : 'conexión rechazada o inaccesible';
    console.warn(`[gateway] ${service.name} no disponible: ${reason}`);
    return 'UNAVAILABLE';
  }
}
