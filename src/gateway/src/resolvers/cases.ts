import type { GatewayConfig } from '../config/config.ts';
import { requireRole, type GatewayContext } from '../context.ts';
import { createRestClient } from '../clients/rest-client.ts';

function object(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response');
  return data as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== 'string') throw new Error('Invalid text'); return value; }
function optional(value: unknown): string | null { return value === null ? null : text(value); }
function integer(value: unknown): number { if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) throw new Error('Invalid version'); return value; }
function flag(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('Invalid boolean'); return value; }
function state(value: unknown): string { if (!['OPEN', 'CLOSED', 'ARCHIVED'].includes(text(value))) throw new Error('Invalid state'); return text(value); }
function caseFile(data: unknown) {
  const value = object(data);
  if (!['CIVIL', 'PENAL'].includes(text(value.area))) throw new Error('Invalid area');
  return { id: text(value.id), code: text(value.code), title: text(value.title), description: optional(value.description), area: text(value.area),
    initialAgentId: text(value.initialAgentId), state: state(value.state), version: integer(value.version), archiving: flag(value.archiving) };
}
function eligibility(data: unknown) {
  const value = object(data);
  return { id: text(value.id), state: state(value.state), initialAgentId: text(value.initialAgentId), version: integer(value.version),
    archiving: flag(value.archiving), questionsAllowed: flag(value.questionsAllowed) };
}
function transition(data: unknown) {
  const value = object(data);
  return { id: text(value.id), previousState: state(value.previousState), newState: state(value.newState), date: text(value.date),
    authorId: text(value.authorId), version: integer(value.version) };
}
function page<T>(data: unknown, parse: (value: unknown) => T) {
  const value = object(data), info = object(value.pageInfo);
  if (!Array.isArray(value.items) || value.items.length > 100) throw new Error('Invalid page');
  const hasNextPage = flag(info.hasNextPage), endCursor = optional(info.endCursor);
  if (hasNextPage && !endCursor) throw new Error('Missing cursor');
  return { items: value.items.map(parse), pageInfo: { hasNextPage, endCursor } };
}
interface ListArgs { first: number; after?: string; filter?: { state?: string; area?: string; code?: string; title?: string } }
export function createCaseResolvers(config: GatewayConfig) {
  const rest = createRestClient(config);
  async function call<T>(context: GatewayContext, path: string, method: 'GET' | 'POST' | 'PUT', parse: (data: unknown) => T,
    body?: unknown, query?: Record<string, string | number | undefined>, archive = false) {
    await requireRole(context, ['ABOGADO']);
    return rest({ service: 'ms-01-juridico', operation: 'cases', path, method, parse, body, query,
      ...(archive ? { timeoutMs: config.aiBudgetMs } : {}) }, context);
  }
  return {
    Query: {
      cases: (_parent: unknown, args: ListArgs, context: GatewayContext) => {
        const query = Object.fromEntries(Object.entries({ ...args.filter, first: args.first, after: args.after }).filter(([, value]) => value != null)) as Record<string, string | number>;
        return call(context, '/cases', 'GET', data => page(data, caseFile), undefined, query);
      },
      caseFile: (_parent: unknown, args: { id: string }, context: GatewayContext) => call(context, `/cases/${encodeURIComponent(args.id)}`, 'GET', caseFile),
      caseEligibility: (_parent: unknown, args: { id: string }, context: GatewayContext) => call(context, `/cases/${encodeURIComponent(args.id)}/eligibility`, 'GET', eligibility),
      caseHistory: (_parent: unknown, args: { id: string; first: number; after?: string }, context: GatewayContext) =>
        call(context, `/cases/${encodeURIComponent(args.id)}/transitions`, 'GET', data => page(data, transition), undefined, { first: args.first, after: args.after ?? undefined }),
    },
    Mutation: {
      createCase: (_parent: unknown, args: { input: unknown }, context: GatewayContext) => call(context, '/cases', 'POST', caseFile, args.input),
      updateCase: (_parent: unknown, args: { id: string; input: unknown; expectedVersion: number }, context: GatewayContext) =>
        call(context, `/cases/${encodeURIComponent(args.id)}`, 'PUT', caseFile, { input: args.input, expectedVersion: args.expectedVersion }),
      transitionCase: (_parent: unknown, args: { id: string; action: string; expectedVersion: number; confirmConversationDeletion: boolean }, context: GatewayContext) =>
        call(context, `/cases/${encodeURIComponent(args.id)}/transitions`, 'POST', caseFile,
          { action: args.action, expectedVersion: args.expectedVersion, confirmConversationDeletion: args.confirmConversationDeletion }, undefined, args.action === 'ARCHIVE'),
    },
  };
}