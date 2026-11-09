import type { GatewayConfig, ServiceName } from '../config/config.ts';
import type { GatewayContext } from '../context.ts';
import { type ErrorCategory, isErrorCategory, lexError, safeFieldErrors, safeMessage } from '../errors.ts';
import { MIN_SIGNING_KEY_LENGTH, signUserContext, USER_CONTEXT_HEADER } from './user-context.ts';

export const CORRELATION_HEADER = 'X-Correlation-Id';
// Milisegundos de los que dispone el receptor; permite propagar un presupuesto total.
export const DEADLINE_HEADER = 'X-Lex-Deadline-Ms';

/** Plazo total compartido por los pasos de una operación (p. ej. IA); no se reinicia en cada llamada. */
export interface Deadline {
  expiresAt: number;
}

export function startDeadline(budgetMs: number): Deadline {
  return { expiresAt: Date.now() + budgetMs };
}

export interface RestRequest<T> {
  service: ServiceName;
  /** Nombre de la operación para los registros. */
  operation: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Sustituye el plazo ordinario, p. ej. `fileTransferTimeoutMs`. */
  timeoutMs?: number;
  deadline?: Deadline;
  /** Valida y traduce la respuesta; debe lanzar si no cumple el contrato. */
  parse: (data: unknown) => T;
}

export type RestClient = <T>(request: RestRequest<T>, context: GatewayContext) => Promise<T>;

/**
 * Transporte REST hacia los servicios propietarios: autenticación interna,
 * contexto firmado, plazo y traducción de fallos. Nunca reintenta.
 */
export function createRestClient(config: GatewayConfig): RestClient {
  const targets = new Map(config.services.map((service) => [service.name, service]));

  return async function callService<T>(request: RestRequest<T>, context: GatewayContext): Promise<T> {
    const target = targets.get(request.service);
    const fail = (category: ErrorCategory, reason: string, details: { message?: unknown; fields?: unknown } = {}) => {
      console.warn(
        `[gateway] ${request.operation} -> ${request.service}: ${category} (${reason}) correlacion=${context.correlationId}`,
      );
      return lexError(category, {
        message: category === 'SERVICE_UNAVAILABLE' ? undefined : safeMessage(category, details.message),
        fields: safeFieldErrors(details.fields),
        correlationId: context.correlationId,
      });
    };

    if (!target?.apiToken) {
      throw fail('SERVICE_UNAVAILABLE', 'credencial interna no configurada');
    }

    const timeoutMs = Math.min(
      request.timeoutMs ?? (request.deadline ? Number.POSITIVE_INFINITY : config.restTimeoutMs),
      request.deadline ? request.deadline.expiresAt - Date.now() : Number.POSITIVE_INFINITY,
    );
    if (timeoutMs <= 0) {
      throw fail('SERVICE_UNAVAILABLE', 'plazo total agotado');
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${target.apiToken}`,
      [CORRELATION_HEADER]: context.correlationId,
      [DEADLINE_HEADER]: String(Math.floor(timeoutMs)),
    };
    if (context.identity) {
      if (config.userContextSigningKey.length < MIN_SIGNING_KEY_LENGTH) {
        throw fail('SERVICE_UNAVAILABLE', 'clave de firma de contexto no configurada');
      }
      headers[USER_CONTEXT_HEADER] = signUserContext(context.identity, config.userContextSigningKey);
    }
    if (request.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    // Concatenar evita que una ruta como `//otro-host` cambie el destino; los segmentos variables van con encodeURIComponent.
    const url = new URL(`${target.url.replace(/\/+$/, '')}/${request.path.replace(/^\/+/, '')}`);
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    let status: number;
    let data: unknown;
    try {
      const response = await fetch(url, {
        method: request.method ?? 'GET',
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'error',
      });
      status = response.status;
      const text = await response.text();
      data = text === '' ? undefined : JSON.parse(text);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw fail('SERVICE_UNAVAILABLE', 'tiempo de espera agotado');
      }
      if (error instanceof SyntaxError) {
        throw fail('SERVICE_UNAVAILABLE', 'respuesta no JSON');
      }
      throw fail('SERVICE_UNAVAILABLE', 'conexión rechazada o inaccesible');
    }

    if (status >= 200 && status < 300) {
      try {
        return request.parse(data);
      } catch {
        throw fail('SERVICE_UNAVAILABLE', 'respuesta fuera de contrato');
      }
    }

    const body = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
    // 401 indica credencial interna o contexto firmado rechazados: es un fallo de integración, no del usuario.
    if (status === 401 || body.category === 'UNAUTHENTICATED') {
      throw fail('SERVICE_UNAVAILABLE', `autenticación interna rechazada (HTTP ${status})`);
    }
    if (!isErrorCategory(body.category)) {
      throw fail('SERVICE_UNAVAILABLE', `error fuera de contrato (HTTP ${status})`);
    }
    throw fail(body.category, `HTTP ${status}`, { message: body.message, fields: body.fields });
  };
}
