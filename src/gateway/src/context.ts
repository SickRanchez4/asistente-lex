import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { lexError } from './errors.ts';

export type Role = 'ABOGADO' | 'ADMINISTRADOR';

/** Identidad ya verificada por MS-01; nunca se construye con datos del cliente. */
export interface VerifiedIdentity {
  userId: string;
  role: Role;
  accountId: string;
}

export interface GatewayContext {
  correlationId: string;
  identity: VerifiedIdentity | null;
}

/**
 * Los encabezados de identidad que envíe el navegador se ignoran: la identidad
 * solo procede de la sesión verificada por MS-01 (spec 003).
 */
export async function createContext({ req }: { req: IncomingMessage }): Promise<GatewayContext> {
  return {
    correlationId: randomUUID(),
    identity: await resolveIdentity(req),
  };
}

// Pendiente de 003-T01: verificar la cookie de sesión contra el contrato de MS-01.
// Mientras no exista, ninguna solicitud tiene identidad y las operaciones protegidas se rechazan.
async function resolveIdentity(_req: IncomingMessage): Promise<VerifiedIdentity | null> {
  return null;
}

/** Usar al inicio de cada resolver protegido, antes de invocar cualquier servicio. */
export function requireIdentity(context: GatewayContext): VerifiedIdentity {
  if (!context.identity) {
    throw lexError('UNAUTHENTICATED', { correlationId: context.correlationId });
  }
  return context.identity;
}
