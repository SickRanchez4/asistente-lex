import type { GatewayConfig } from '../config/config.ts';
import { requireRole, type GatewayContext } from '../context.ts';
import { createRestClient } from '../clients/rest-client.ts';
import { decodeBase64 } from '../base64.ts';

const toolIds = ['CASE_LEGAL_DATA', 'CASE_PDF_LIST', 'CASE_PDF_TEXT'];
function object(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid agent response');
  return data as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid agent text');
  return value;
}
function optional(value: unknown): string | null { return value == null ? null : text(value); }
function lawMetadata(data: unknown) {
  const value = object(data), name = text(value.name), uploadedAt = text(value.uploadedAt), sha256 = text(value.sha256);
  if (!name.toLowerCase().endsWith('.md') || name.length > 180 || !Number.isFinite(Date.parse(uploadedAt))
    || !/^[a-f0-9]{64}$/.test(sha256) || typeof value.size !== 'number' || !Number.isSafeInteger(value.size)
    || value.size < 1 || value.size > 262144) throw new Error('Invalid law metadata');
  return { id: text(value.id), name, size: value.size, sha256, authorId: text(value.authorId), uploadedAt };
}
function law(data: unknown) {
  const value = object(data), metadata = lawMetadata(value), content = text(value.text);
  if (Buffer.byteLength(content, 'utf8') !== metadata.size) throw new Error('Invalid law content');
  return { ...metadata, text: content };
}
function available(data: unknown) {
  const value = object(data), id = text(value.id);
  if (!['penalista', 'civilista'].includes(id) || typeof value.enabled !== 'boolean') throw new Error('Invalid agent');
  return { id, name: text(value.name), specialty: text(value.specialty), enabled: value.enabled,
    unavailableReason: optional(value.unavailableReason) };
}
function configuration(data: unknown) {
  const value = object(data), projection = available(value);
  if (!Array.isArray(value.tools) || value.tools.length > 3 || new Set(value.tools).size !== value.tools.length
    || value.tools.some(tool => !toolIds.includes(text(tool)))) throw new Error('Invalid agent tools');
  if (!Array.isArray(value.laws) || value.laws.length > 10) throw new Error('Invalid agent library');
  return { id: projection.id, name: projection.name, specialty: projection.specialty, enabled: projection.enabled,
    revision: text(value.revision), instructions: text(value.instructions), model: text(value.model),
    tools: value.tools.map(text), laws: value.laws.map(lawMetadata), authorId: optional(value.authorId), occurredAt: text(value.occurredAt) };
}
function catalog<T extends { id: string }>(data: unknown, parse: (value: unknown) => T): T[] {
  if (!Array.isArray(data) || data.length !== 2) throw new Error('Invalid agent catalog');
  const agents = data.map(parse);
  if (new Set(agents.map(agent => agent.id)).size !== 2) throw new Error('Duplicate agent');
  return agents;
}
function change(data: unknown) {
  const value = object(data);
  if (value.applied !== true || typeof value.auditRecorded !== 'boolean'
    || (value.auditRecorded ? value.category != null : value.category !== 'PARTIAL_FAILURE')) throw new Error('Invalid agent outcome');
  return { applied: true, auditRecorded: value.auditRecorded, category: optional(value.category),
    message: text(value.message), agent: configuration(value.agent) };
}
function history(data: unknown) {
  const value = object(data), info = object(value.pageInfo);
  if (!Array.isArray(value.items) || value.items.length > 100 || typeof info.hasNextPage !== 'boolean') throw new Error('Invalid agent history');
  const endCursor = optional(info.endCursor);
  if (info.hasNextPage && !endCursor) throw new Error('Missing agent cursor');
  return { items: value.items.map(item => {
    const revision = object(item);
    return { current: configuration(revision.current), previous: revision.previous == null ? null : configuration(revision.previous) };
  }), pageInfo: { hasNextPage: info.hasNextPage, endCursor } };
}

export function createAgentResolvers(config: GatewayConfig) {
  const rest = createRestClient(config);
  async function admin<T>(context: GatewayContext, path: string, method: 'GET' | 'PUT' | 'POST' | 'DELETE', parse: (data: unknown) => T,
    body?: unknown, query?: Record<string, string | number | undefined>) {
    await requireRole(context, ['ADMINISTRADOR']);
    return rest({ service: 'ms-04-ia', operation: 'agentAdministration', path, method, parse, body, query }, context);
  }
  return {
    Query: {
      availableAgents: async (_parent: unknown, _args: unknown, context: GatewayContext) => {
        await requireRole(context, ['ABOGADO', 'ADMINISTRADOR']);
        return rest({ service: 'ms-04-ia', operation: 'availableAgents', path: '/agents', parse: data => catalog(data, available) }, context);
      },
      adminAgents: (_parent: unknown, _args: unknown, context: GatewayContext) =>
        admin(context, '/admin/agents', 'GET', data => catalog(data, configuration)),
      adminAgentLaw: (_parent: unknown, args: { id: string; lawId: string }, context: GatewayContext) =>
        admin(context, `/admin/agents/${encodeURIComponent(args.id)}/laws/${encodeURIComponent(args.lawId)}`, 'GET', law),
      adminAgentHistory: (_parent: unknown, args: { id: string; first: number; after?: string | null }, context: GatewayContext) =>
        admin(context, `/admin/agents/${encodeURIComponent(args.id)}/history`, 'GET', history, undefined, { first: args.first, after: args.after ?? undefined }),
    },
    Mutation: {
      updateAgentConfiguration: (_parent: unknown, args: { id: string; input: { expectedRevision: string; instructions: string; model: string; tools: string[] } }, context: GatewayContext) =>
        admin(context, `/admin/agents/${encodeURIComponent(args.id)}/configuration`, 'PUT', change, args.input),
      setAgentEnabled: (_parent: unknown, args: { id: string; expectedRevision: string; enabled: boolean }, context: GatewayContext) =>
        admin(context, `/admin/agents/${encodeURIComponent(args.id)}/enabled`, 'PUT', change, { expectedRevision: args.expectedRevision, enabled: args.enabled }),
      uploadAgentLaw: async (_parent: unknown, args: { id: string; input: { expectedRevision: string; name: string; base64: string } }, context: GatewayContext) => {
        await requireRole(context, ['ADMINISTRADOR']);
        decodeBase64(args.input.base64, 262144, context.correlationId);
        return admin(context, `/admin/agents/${encodeURIComponent(args.id)}/laws`, 'POST', change, args.input);
      },
      removeAgentLaw: (_parent: unknown, args: { id: string; lawId: string; expectedRevision: string }, context: GatewayContext) =>
        admin(context, `/admin/agents/${encodeURIComponent(args.id)}/laws/${encodeURIComponent(args.lawId)}`, 'DELETE', change, { expectedRevision: args.expectedRevision }),
    },
  };
}