import type { GatewayConfig } from '../config/config.ts';
import { requireRole, type GatewayContext } from '../context.ts';
import { createRestClient } from '../clients/rest-client.ts';

function object(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response');
  return data as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== 'string') throw new Error('Invalid text'); return value; }
function flag(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('Invalid boolean'); return value; }
function participant(data: unknown) {
  const value = object(data), person = object(value.person);
  if (!['NATURAL', 'LEGAL'].includes(text(person.type)) || !['REPRESENTED_PERSON', 'COUNTERPARTY', 'WITNESS', 'REPRESENTATIVE', 'OTHER'].includes(text(value.role))
    || typeof value.version !== 'number' || !Number.isInteger(value.version) || value.version < 1) throw new Error('Invalid participant');
  const detail = value.detail === null ? null : text(value.detail);
  if ((value.role === 'OTHER' && !detail?.trim()) || (value.role !== 'OTHER' && detail !== null)) throw new Error('Invalid role detail');
  return { id: text(value.id), person: { id: text(person.id), type: text(person.type), displayName: text(person.displayName) }, role: text(value.role), detail, version: value.version };
}
function page(data: unknown) {
  const value = object(data), info = object(value.pageInfo);
  if (!Array.isArray(value.items) || value.items.length > 100) throw new Error('Invalid page');
  const hasNextPage = flag(info.hasNextPage), endCursor = info.endCursor === null ? null : text(info.endCursor);
  if (hasNextPage && !endCursor) throw new Error('Missing cursor');
  return { items: value.items.map(participant), pageInfo: { hasNextPage, endCursor } };
}
function removal(data: unknown) {
  const value = object(data);
  if (!flag(value.removed)) throw new Error('Removal not confirmed');
  return { id: text(value.id), removed: true };
}
export function createParticipantResolvers(config: GatewayConfig) {
  const rest = createRestClient(config);
  async function call<T>(context: GatewayContext, path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', parse: (data: unknown) => T,
    body?: unknown, query?: Record<string, string | number | undefined>) {
    await requireRole(context, ['ABOGADO']);
    return rest({ service: 'ms-01-juridico', operation: 'participants', path, method, parse, body, query }, context);
  }
  const path = (caseId: string) => `/cases/${encodeURIComponent(caseId)}/participants`;
  return {
    Query: {
      participants: (_parent: unknown, args: { caseId: string; first: number; after?: string | null }, context: GatewayContext) =>
        call(context, path(args.caseId), 'GET', page, undefined, { first: args.first, after: args.after ?? undefined }),
    },
    Mutation: {
      linkParticipant: (_parent: unknown, args: { caseId: string; personId: string; input: unknown }, context: GatewayContext) =>
        call(context, path(args.caseId), 'POST', participant, { personId: args.personId, input: args.input }),
      updateParticipant: (_parent: unknown, args: { caseId: string; id: string; input: unknown; expectedVersion: number }, context: GatewayContext) =>
        call(context, `${path(args.caseId)}/${encodeURIComponent(args.id)}`, 'PUT', participant, { input: args.input, expectedVersion: args.expectedVersion }),
      unlinkParticipant: (_parent: unknown, args: { caseId: string; id: string; expectedVersion: number }, context: GatewayContext) =>
        call(context, `${path(args.caseId)}/${encodeURIComponent(args.id)}`, 'DELETE', removal, undefined, { expectedVersion: args.expectedVersion }),
    },
  };
}