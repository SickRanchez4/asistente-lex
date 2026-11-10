import type { GatewayConfig } from '../config/config.ts';
import { createRestClient, startDeadline } from '../clients/rest-client.ts';
import { requireRole, type GatewayContext } from '../context.ts';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid chat response');
  return value as Record<string, unknown>;
}
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw Error('Invalid chat text'); return value; }
function integer(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw Error('Invalid chat version'); return value; }
function date(value: unknown): string { const result = text(value); if (!Number.isFinite(Date.parse(result))) throw Error('Invalid chat date'); return result; }
function agent(value: unknown) {
  const item = object(value), id = text(item.id);
  if (!['civilista', 'penalista'].includes(id)) throw Error('Invalid agent');
  return { id, name: text(item.name) };
}
function source(value: unknown) {
  const item = object(value), kind = text(item.kind), id = text(item.id);
  if (!['CASE', 'PDF', 'LAW'].includes(kind) || !id.startsWith(kind + ':')) throw Error('Invalid source');
  return { id, kind, label: text(item.label) };
}
function summary(value: unknown) {
  const item = object(value);
  return { id: text(item.id), caseId: text(item.caseId), createdAt: date(item.createdAt), activeAgent: agent(item.activeAgent), version: integer(item.version) };
}
function conversation(value: unknown) {
  const item = object(value);
  if (!Array.isArray(item.exchanges)) throw Error('Invalid exchanges');
  return { ...summary(item), exchanges: item.exchanges.map(value => {
    const exchange = object(value), question = text(exchange.question), answer = text(exchange.answer);
    if (question.length > 8000 || answer.length > 50000 || !Array.isArray(exchange.sources) || exchange.sources.length > 100) throw Error('Invalid exchange');
    return { id: text(exchange.id), question, answer, agent: agent(exchange.agent), occurredAt: date(exchange.occurredAt), sources: exchange.sources.map(source) };
  }) };
}
function page(value: unknown) {
  const item = object(value), info = object(item.pageInfo);
  if (!Array.isArray(item.items) || item.items.length > 100 || typeof info.hasNextPage !== 'boolean') throw Error('Invalid chat page');
  const endCursor = info.endCursor === null ? null : text(info.endCursor);
  if (info.hasNextPage && !endCursor) throw Error('Invalid chat cursor');
  return { items: item.items.map(summary), pageInfo: { hasNextPage: info.hasNextPage, endCursor } };
}
interface Scope { caseId: string; id: string }
export function createConversationResolvers(config: GatewayConfig) {
  const rest = createRestClient(config);
  async function call<T>(context: GatewayContext, caseId: string, id: string | undefined, part: string, method: 'GET' | 'POST' | 'PUT', parse: (value: unknown) => T, body?: unknown, query?: Record<string, string | number | undefined>, question = false) {
    const deadline = question ? startDeadline(config.aiBudgetMs) : undefined;
    await requireRole(context, ['ABOGADO']);
    return rest({ service: 'ms-04-ia', operation: 'legal-conversations', path: `/cases/${encodeURIComponent(caseId)}/conversations${id ? '/' + encodeURIComponent(id) : ''}${part}`, method, parse, body, query, deadline }, context);
  }
  return {
    Query: {
      legalConversations: (_parent: unknown, args: { caseId: string; first: number; after?: string | null }, context: GatewayContext) => call(context, args.caseId, undefined, '', 'GET', page, undefined, { first: args.first, after: args.after ?? undefined }),
      legalConversation: (_parent: unknown, args: Scope, context: GatewayContext) => call(context, args.caseId, args.id, '', 'GET', conversation),
    },
    Mutation: {
      startLegalConversation: (_parent: unknown, args: { caseId: string; agentId?: string | null }, context: GatewayContext) => call(context, args.caseId, undefined, '', 'POST', conversation, { agentId: args.agentId ?? null }),
      changeConversationAgent: (_parent: unknown, args: Scope & { agentId: string; expectedVersion: number }, context: GatewayContext) => call(context, args.caseId, args.id, '/agent', 'PUT', conversation, { agentId: args.agentId, expectedVersion: args.expectedVersion }),
      askLegalQuestion: (_parent: unknown, args: Scope & { input: unknown }, context: GatewayContext) => call(context, args.caseId, args.id, '/questions', 'POST', conversation, args.input, undefined, true),
    },
  };
}