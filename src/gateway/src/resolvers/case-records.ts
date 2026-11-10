import type { GatewayConfig } from '../config/config.ts';
import { requireRole, type GatewayContext } from '../context.ts';
import { createRestClient } from '../clients/rest-client.ts';

function object(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response');
  return data as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== 'string') throw new Error('Invalid text'); return value; }
function version(value: unknown): number { if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) throw new Error('Invalid version'); return value; }
function actuation(data: unknown) {
  const value = object(data), date = text(value.date), description = text(value.description), type = text(value.type);
  if (!['HEARING', 'FILING', 'DECISION', 'NOTIFICATION', 'OTHER'].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !description.trim() || description.length > 10000) throw new Error('Invalid actuation');
  return { id: text(value.id), type, date, description, version: version(value.version) };
}
function note(data: unknown) {
  const value = object(data), date = text(value.date), content = text(value.text);
  if (value.privacy !== 'OWNER_ONLY' || !Number.isFinite(Date.parse(date)) || !content.trim() || content.length > 20000) throw new Error('Invalid private note');
  return { id: text(value.id), text: content, date, version: version(value.version), privacy: 'OWNER_ONLY' };
}
function page<T>(data: unknown, parse: (data: unknown) => T) {
  const value = object(data), info = object(value.pageInfo);
  if (!Array.isArray(value.items) || value.items.length > 100 || typeof info.hasNextPage !== 'boolean') throw new Error('Invalid page');
  const endCursor = info.endCursor === null ? null : text(info.endCursor);
  if (info.hasNextPage && !endCursor) throw new Error('Missing cursor');
  return { items: value.items.map(parse), pageInfo: { hasNextPage: info.hasNextPage, endCursor } };
}
interface Scope { caseId: string; id: string }
interface Paging { first: number; after?: string | null }
interface Filter { type?: string | null; fromDate?: string | null; toDate?: string | null }
interface Change extends Scope { input: unknown; expectedVersion: number }
export function createCaseRecordResolvers(config: GatewayConfig) {
  const rest = createRestClient(config);
  async function call<T>(context: GatewayContext, kind: 'actuations' | 'private-notes', caseId: string, id: string | undefined, method: 'GET' | 'POST' | 'PUT', parse: (data: unknown) => T, body?: unknown, query?: Record<string, string | number | undefined>) {
    await requireRole(context, ['ABOGADO']);
    const path = `/cases/${encodeURIComponent(caseId)}/${kind}${id === undefined ? '' : `/${encodeURIComponent(id)}`}`;
    return rest({ service: 'ms-01-juridico', operation: kind, path, method, parse, body, query }, context);
  }
  return {
    Query: {
      actuations: (_parent: unknown, args: { caseId: string; filter?: Filter | null } & Paging, context: GatewayContext) =>
        call(context, 'actuations', args.caseId, undefined, 'GET', data => page(data, actuation), undefined, { first: args.first, after: args.after ?? undefined, type: args.filter?.type ?? undefined, fromDate: args.filter?.fromDate ?? undefined, toDate: args.filter?.toDate ?? undefined }),
      actuation: (_parent: unknown, args: Scope, context: GatewayContext) => call(context, 'actuations', args.caseId, args.id, 'GET', actuation),
      privateNotes: (_parent: unknown, args: { caseId: string; search?: string | null } & Paging, context: GatewayContext) =>
        call(context, 'private-notes', args.caseId, undefined, 'GET', data => page(data, note), undefined, { first: args.first, after: args.after ?? undefined, search: args.search ?? undefined }),
      privateNote: (_parent: unknown, args: Scope, context: GatewayContext) => call(context, 'private-notes', args.caseId, args.id, 'GET', note),
    },
    Mutation: {
      createActuation: (_parent: unknown, args: { caseId: string; input: unknown }, context: GatewayContext) => call(context, 'actuations', args.caseId, undefined, 'POST', actuation, args.input),
      updateActuation: (_parent: unknown, args: Change, context: GatewayContext) => call(context, 'actuations', args.caseId, args.id, 'PUT', actuation, { input: args.input, expectedVersion: args.expectedVersion }),
      createPrivateNote: (_parent: unknown, args: { caseId: string; input: unknown }, context: GatewayContext) => call(context, 'private-notes', args.caseId, undefined, 'POST', note, args.input),
      updatePrivateNote: (_parent: unknown, args: Change, context: GatewayContext) => call(context, 'private-notes', args.caseId, args.id, 'PUT', note, { input: args.input, expectedVersion: args.expectedVersion }),
    },
  };
}