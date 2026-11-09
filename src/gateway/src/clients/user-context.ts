import { createHmac } from 'node:crypto';

import type { VerifiedIdentity } from '../context.ts';

export const USER_CONTEXT_HEADER = 'X-Lex-User-Context';

// Cubre el presupuesto IA de 60 s con margen; los receptores rechazan contextos vencidos.
const CONTEXT_TTL_SECONDS = 120;

export const MIN_SIGNING_KEY_LENGTH = 32;

/**
 * Contexto de usuario firmado con HMAC-SHA256: `base64url(json).base64url(firma)`.
 * Los servicios verifican la firma y el vencimiento con la misma clave del entorno.
 */
export function signUserContext(identity: VerifiedIdentity, signingKey: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId: identity.userId,
      role: identity.role,
      accountId: identity.accountId,
      exp: Math.floor(Date.now() / 1000) + CONTEXT_TTL_SECONDS,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', signingKey).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
