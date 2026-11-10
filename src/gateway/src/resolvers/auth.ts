import type { GatewayConfig } from '../config/config.ts';
import type { GatewayContext, VerifiedIdentity } from '../context.ts';
import { createRestClient } from '../clients/rest-client.ts';
import { isErrorCategory, lexError } from '../errors.ts';

export interface AuthResult {
  success: boolean;
  user: (VerifiedIdentity & { name: string }) | null;
  token?: string | null;
  category: string | null;
  message: string | null;
  auditRecorded: boolean;
}

export function parseAuthResult(data: unknown): AuthResult {
  if (!data || typeof data !== 'object') throw new Error('Invalid auth response');
  const value = data as Record<string, unknown>;
  if (typeof value.success !== 'boolean' || typeof value.auditRecorded !== 'boolean') throw new Error('Invalid outcome');
  const user = value.user as Record<string, unknown> | null;
  if (user && (typeof user.userId !== 'string' || typeof user.accountId !== 'string' || typeof user.name !== 'string'
    || !['ABOGADO', 'ADMINISTRADOR'].includes(String(user.role)))) throw new Error('Invalid identity');
  if (value.category != null && !isErrorCategory(value.category)) throw new Error('Invalid category');
  if (value.message != null && (typeof value.message !== 'string' || value.message.length > 500)) throw new Error('Invalid message');
  if (value.token != null && (typeof value.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.token))) throw new Error('Invalid session');
  return { success: value.success, auditRecorded: value.auditRecorded, user: user ? {
    userId: String(user.userId), accountId: String(user.accountId), role: user.role as 'ABOGADO' | 'ADMINISTRADOR', name: String(user.name),
  } : null, category: value.category as string ?? null, message: value.message as string ?? null, token: value.token as string ?? null };
}

export function createAuthResolvers(config: GatewayConfig) {
  const rest = createRestClient(config);
  const call = (path: string, body: unknown, context: GatewayContext) => rest({ service: 'ms-01-juridico', operation: path,
    path: `/auth/${path}`, method: 'POST', body, parse: parseAuthResult }, { ...context, identity: null });
  return {
    Query: {
      session: (_parent: unknown, _args: unknown, context: GatewayContext) => context.authenticate!(false),
    },
    Mutation: {
      login: async (_parent: unknown, args: { email: string; password: string }, context: GatewayContext) => {
        const result = await call('login', args, context);
        if (result.success) {
          if (!result.token || !result.user) throw lexError('SERVICE_UNAVAILABLE');
          context.sessionToken = result.token;
          context.identity = result.user;
          context.response!.cookie('lex_session', result.token, { httpOnly: true, sameSite: 'strict', secure: config.cookieSecure,
            path: '/graphql', maxAge: 8 * 60 * 60 * 1000 });
        }
        return result;
      },
      logout: async (_parent: unknown, _args: unknown, context: GatewayContext) => {
        const result = await call('logout', { token: context.sessionToken }, context);
        if (result.success || result.category === 'UNAUTHENTICATED') {
          context.response!.clearCookie('lex_session', { path: '/graphql', httpOnly: true, sameSite: 'strict', secure: config.cookieSecure });
          context.identity = null;
          context.sessionToken = '';
        }
        return result;
      },
      changePassword: (_parent: unknown, args: { currentPassword: string; newPassword: string }, context: GatewayContext) =>
        call('password', { ...args, token: context.sessionToken }, context),
      sessionActivity: (_parent: unknown, _args: unknown, context: GatewayContext) => context.authenticate!(true),
    },
  };
}