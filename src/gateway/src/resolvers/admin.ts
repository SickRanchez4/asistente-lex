import type { GatewayConfig } from '../config/config.ts';
import { requireRole, type GatewayContext } from '../context.ts';
import { createRestClient } from '../clients/rest-client.ts';
import { isErrorCategory } from '../errors.ts';

function object(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response');
  return data as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid text');
  return value;
}
function optional(value: unknown): string | null { return value == null ? null : text(value); }
function account(data: unknown) {
  const value = object(data);
  if (typeof value.enabled !== 'boolean') throw new Error('Invalid account');
  return { id: text(value.id), name: text(value.name), email: text(value.email), enabled: value.enabled };
}
function settings(data: unknown) {
  const value = object(data);
  return { globalMessage: text(value.globalMessage), supportEmail: text(value.supportEmail) };
}
function page<T>(data: unknown, parse: (value: unknown) => T) {
  const value = object(data), info = object(value.pageInfo);
  if (!Array.isArray(value.items) || value.items.length > 100 || typeof info.hasNextPage !== 'boolean') throw new Error('Invalid page');
  const endCursor = optional(info.endCursor);
  if (info.hasNextPage && !endCursor) throw new Error('Missing cursor');
  return { items: value.items.map(parse), pageInfo: { hasNextPage: info.hasNextPage, endCursor } };
}
function change(data: unknown) {
  const value = object(data);
  if (value.applied !== true || typeof value.auditRecorded !== 'boolean'
    || (value.category != null && !isErrorCategory(value.category))
    || (!value.auditRecorded && value.category !== 'PARTIAL_FAILURE')) throw new Error('Invalid outcome');
  return { applied: true, auditRecorded: value.auditRecorded, category: optional(value.category), message: optional(value.message),
    account: value.account == null ? null : account(value.account), settings: value.settings == null ? null : settings(value.settings) };
}
function event(data: unknown) {
  const value = object(data);
  if (!['LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'ACCESS_DENIED', 'PASSWORD_CHANGED', 'ADMIN_CHANGE', 'AGENT_ACTION', 'AI_ACTION'].includes(text(value.type))) throw new Error('Invalid event type');
  if (value.parameter != null && !['GLOBAL_MESSAGE', 'SUPPORT_EMAIL'].includes(text(value.parameter))) throw new Error('Invalid parameter');
  return { id: text(value.id), type: text(value.type), date: text(value.date), userId: optional(value.userId), result: text(value.result),
    operation: optional(value.operation), targetId: optional(value.targetId), parameter: optional(value.parameter),
    previousValue: optional(value.previousValue), newValue: optional(value.newValue), agentId: optional(value.agentId) };
}

export function createAdminResolvers(config: GatewayConfig) {
  const rest = createRestClient(config);
  async function call<T>(context: GatewayContext, path: string, method: 'GET' | 'POST' | 'PUT', parse: (data: unknown) => T,
    body?: unknown, query?: Record<string, string | number | undefined>) {
    await requireRole(context, ['ADMINISTRADOR']);
    return rest({ service: 'ms-01-juridico', operation: 'administration', path, method, parse, body, query }, context);
  }
  return {
    Query: {
      adminAccounts: (_parent: unknown, args: { first: number; after?: string | null }, context: GatewayContext) =>
        call(context, '/admin/accounts', 'GET', (data) => page(data, account), undefined, { first: args.first, after: args.after ?? undefined }),
      adminAccount: (_parent: unknown, args: { id: string }, context: GatewayContext) =>
        call(context, `/admin/accounts/${encodeURIComponent(args.id)}`, 'GET', account),
      applicationSettings: (_parent: unknown, _args: unknown, context: GatewayContext) =>
        rest({ service: 'ms-01-juridico', operation: 'applicationSettings', path: '/public/settings', parse: settings }, { ...context, identity: null }),
      adminAuditEvents: (_parent: unknown, args: { first: number; after?: string; filter?: { type?: string; from?: string; until?: string; userId?: string } }, context: GatewayContext) => {
        const query = Object.fromEntries(Object.entries({ ...args.filter, first: args.first, after: args.after }).filter(([, value]) => value != null)) as Record<string, string | number>;
        return call(context, '/admin/audit-events', 'GET', (data) => page(data, event), undefined, query);
      },
    },
    Mutation: {
      createLawyerAccount: (_parent: unknown, args: { name: string; email: string; password: string }, context: GatewayContext) =>
        call(context, '/admin/accounts', 'POST', change, args),
      setLawyerAccountEnabled: (_parent: unknown, args: { id: string; enabled: boolean }, context: GatewayContext) =>
        call(context, `/admin/accounts/${encodeURIComponent(args.id)}/enabled`, 'PUT', change, { enabled: args.enabled }),
      resetLawyerPassword: (_parent: unknown, args: { id: string; password: string }, context: GatewayContext) =>
        call(context, `/admin/accounts/${encodeURIComponent(args.id)}/password`, 'PUT', change, { password: args.password }),
      updateApplicationSetting: (_parent: unknown, args: { key: string; value: string }, context: GatewayContext) =>
        call(context, `/admin/settings/${encodeURIComponent(args.key)}`, 'PUT', change, { value: args.value }),
    },
  };
}