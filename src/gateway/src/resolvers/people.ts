import type { GatewayConfig } from '../config/config.ts';
import { requireRole, type GatewayContext } from '../context.ts';
import { createRestClient } from '../clients/rest-client.ts';

function object(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response');
  return data as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid text');
  return value;
}
function optional(value: unknown): string | null { return value === null ? null : text(value); }
function selection(data: unknown) {
  const value = object(data);
  if (!['NATURAL', 'LEGAL'].includes(text(value.type))) throw new Error('Invalid person type');
  return { id: text(value.id), type: text(value.type), displayName: text(value.displayName) };
}
function person(data: unknown) {
  const value = object(data);
  return { ...selection(value), firstNames: optional(value.firstNames), lastNames: optional(value.lastNames), businessName: optional(value.businessName),
    documentType: optional(value.documentType), documentNumber: optional(value.documentNumber), issuingCountry: optional(value.issuingCountry),
    phone: optional(value.phone), email: optional(value.email), address: optional(value.address) };
}
function page<T>(data: unknown, parse: (value: unknown) => T) {
  const value = object(data), info = object(value.pageInfo);
  if (!Array.isArray(value.items) || value.items.length > 100 || typeof info.hasNextPage !== 'boolean') throw new Error('Invalid page');
  const endCursor = optional(info.endCursor);
  if (info.hasNextPage && !endCursor) throw new Error('Missing cursor');
  return { items: value.items.map(parse), pageInfo: { hasNextPage: info.hasNextPage, endCursor } };
}
interface ListArgs { first: number; after?: string; filter?: { name?: string; type?: string; document?: string } }

export function createPeopleResolvers(config: GatewayConfig) {
  const rest = createRestClient(config);
  async function call<T>(context: GatewayContext, path: string, method: 'GET' | 'POST' | 'PUT', parse: (data: unknown) => T,
    body?: unknown, query?: Record<string, string | number | undefined>) {
    await requireRole(context, ['ABOGADO']);
    return rest({ service: 'ms-01-juridico', operation: 'people', path, method, parse, body, query }, context);
  }
  function list(context: GatewayContext, args: ListArgs, minimal: boolean) {
    const query = Object.fromEntries(Object.entries({ ...args.filter, first: args.first, after: args.after }).filter(([, value]) => value != null)) as Record<string, string | number>;
    return minimal ? call(context, '/people/selections', 'GET', data => page(data, selection), undefined, query)
      : call(context, '/people', 'GET', data => page(data, person), undefined, query);
  }
  return {
    Query: {
      people: (_parent: unknown, args: ListArgs, context: GatewayContext) => list(context, args, false),
      personSelections: (_parent: unknown, args: ListArgs, context: GatewayContext) => list(context, args, true),
      person: (_parent: unknown, args: { id: string }, context: GatewayContext) => call(context, `/people/${encodeURIComponent(args.id)}`, 'GET', person),
      personSelection: (_parent: unknown, args: { id: string }, context: GatewayContext) =>
        call(context, `/people/${encodeURIComponent(args.id)}/selection`, 'GET', selection),
    },
    Mutation: {
      createPerson: (_parent: unknown, args: { input: unknown }, context: GatewayContext) => call(context, '/people', 'POST', person, args.input),
      updatePerson: (_parent: unknown, args: { id: string; input: unknown }, context: GatewayContext) =>
        call(context, `/people/${encodeURIComponent(args.id)}`, 'PUT', person, args.input),
    },
  };
}