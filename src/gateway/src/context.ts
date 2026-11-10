import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Response } from 'express';
import type { GatewayConfig } from './config/config.ts';
import { createRestClient } from './clients/rest-client.ts';
import { parseAuthResult, type AuthResult } from './resolvers/auth.ts';

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
  sessionToken?: string;
  response?: Response;
  authenticate?: (active: boolean) => Promise<AuthResult>;
  deny?: () => Promise<AuthResult>;
}

/**
 * Los encabezados de identidad que envíe el navegador se ignoran: la identidad
 * solo procede de la sesión verificada por MS-01 (spec 003).
 */
export function createContextFactory(config: GatewayConfig) {
  const rest = createRestClient(config);
  return async ({ req, res }: { req: IncomingMessage; res: Response }): Promise<GatewayContext> => {
    const cookie = (req.headers.cookie ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith('lex_session='));
    const token = cookie.length === 1 ? cookie[0].slice('lex_session='.length) : '';
    const context: GatewayContext = {
      correlationId: randomUUID(), identity: null, response: res,
      sessionToken: /^[A-Za-z0-9_-]{43}$/.test(token) ? token : '',
    };
    let verified: Promise<AuthResult> | undefined;
    let touched = false;
    context.authenticate = async (active) => {
      if (!context.sessionToken) return { success: false, user: null, category: 'UNAUTHENTICATED', message: 'Debes iniciar sesión.', auditRecorded: true };
      if (!verified || (active && !touched)) {
        touched = active;
        verified = rest({ service: 'ms-01-juridico', operation: 'verifySession', path: '/auth/verify', method: 'POST',
          body: { token: context.sessionToken, active }, parse: parseAuthResult }, { ...context, identity: null });
      }
      const result = await verified;
      context.identity = result.success ? result.user : null;
      if (!result.success) res.clearCookie('lex_session', { path: '/graphql', httpOnly: true, sameSite: 'strict', secure: config.cookieSecure });
      return result;
    };
    context.deny = () => rest({ service: 'ms-01-juridico', operation: 'accessDenied', path: '/auth/denial', method: 'POST',
      body: { token: context.sessionToken }, parse: parseAuthResult }, { ...context, identity: null });
    return context;
  };
}

/** Usar al inicio de cada resolver protegido, antes de invocar cualquier servicio. */
export async function requireIdentity(context: GatewayContext): Promise<VerifiedIdentity> {
  if (context.authenticate) {
    const result = await context.authenticate(true);
    context.identity = result.success ? result.user : null;
  }
  if (!context.identity) {
    throw lexError('UNAUTHENTICATED', { correlationId: context.correlationId });
  }
  return context.identity;
}

export async function requireRole(context: GatewayContext, roles: readonly Role[]): Promise<VerifiedIdentity> {
  const identity = await requireIdentity(context);
  if (!roles.includes(identity.role)) {
    const result = await context.deny?.();
    const error = lexError('FORBIDDEN', { message: result?.message ?? undefined, correlationId: context.correlationId });
    error.extensions.auditRecorded = result?.auditRecorded ?? false;
    throw error;
  }
  return identity;
}

export async function requireAccount(context: GatewayContext, resourceAccountId: string): Promise<VerifiedIdentity> {
  const identity = await requireRole(context, ['ABOGADO']);
  if (identity.accountId !== resourceAccountId) {
    const result = await context.deny?.();
    const error = lexError('FORBIDDEN', { message: result?.message ?? undefined, correlationId: context.correlationId });
    error.extensions.auditRecorded = result?.auditRecorded ?? false;
    throw error;
  }
  return identity;
}
