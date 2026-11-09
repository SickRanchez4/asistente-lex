import { createHmac, timingSafeEqual } from 'node:crypto';

export type Role = 'ABOGADO' | 'ADMINISTRADOR';

/** Identidad del solicitante firmada por el Gateway; la cuenta efectiva sale de aquí, nunca de parámetros. */
export interface VerifiedIdentity {
  userId: string;
  role: Role;
  accountId: string;
}

export type InternalAuthResult = { authenticated: true; identity: VerifiedIdentity | null } | { authenticated: false };

export const USER_CONTEXT_HEADER = 'x-lex-user-context';

const MIN_SIGNING_KEY_LENGTH = 32;

export const UNAUTHENTICATED_BODY = {
  category: 'UNAUTHENTICATED',
  message: 'Solicitud interna no autenticada.',
} as const;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Verifica `base64url(json).base64url(hmac-sha256)` y su vencimiento. */
export function verifyUserContext(value: string, signingKey: string): VerifiedIdentity | null {
  if (signingKey.length < MIN_SIGNING_KEY_LENGTH) {
    return null;
  }
  const [payload, signature, ...rest] = value.split('.');
  if (!payload || !signature || rest.length > 0) {
    return null;
  }
  const expected = createHmac('sha256', signingKey).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const valid =
      typeof claims?.userId === 'string' &&
      claims.userId !== '' &&
      typeof claims.accountId === 'string' &&
      claims.accountId !== '' &&
      (claims.role === 'ABOGADO' || claims.role === 'ADMINISTRADOR') &&
      Number.isInteger(claims.exp) &&
      claims.exp > Math.floor(Date.now() / 1000);
    return valid ? { userId: claims.userId, role: claims.role, accountId: claims.accountId } : null;
  } catch {
    return null;
  }
}

/**
 * Autenticación de llamadas REST internas: credencial del servicio obligatoria y,
 * si se envía, contexto de usuario firmado válido. Sin configuración, rechaza todo.
 */
export function authenticateInternalRequest(
  headers: Headers,
  config: { internalApiToken: string; userContextSigningKey: string },
): InternalAuthResult {
  const authorization = headers.get('authorization') ?? '';
  if (!config.internalApiToken || !authorization.startsWith('Bearer ')) {
    return { authenticated: false };
  }
  if (!safeEqual(authorization.slice('Bearer '.length), config.internalApiToken)) {
    return { authenticated: false };
  }
  const context = headers.get(USER_CONTEXT_HEADER);
  if (context === null) {
    return { authenticated: true, identity: null };
  }
  const identity = verifyUserContext(context, config.userContextSigningKey);
  return identity ? { authenticated: true, identity } : { authenticated: false };
}
