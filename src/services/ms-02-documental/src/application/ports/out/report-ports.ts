import type { Actor, Scope } from './document-ports.ts';
import type { ReportContent, ReportInput, ReportRecord } from '../../../domain/reports.ts';

export interface ReportStore {
  byRequest(scope: Scope, requestId: string): Promise<{ id: string; fingerprint: string; completed: boolean } | null>;
  stage(scope: Scope, id: string, input: ReportInput, fingerprint: string): Promise<void>;
  publish(scope: Scope, id: string, content: ReportContent, size: number): Promise<ReportRecord>;
  abandon(scope: Scope, id: string, remove: () => Promise<void>): Promise<void>;
  get(scope: Scope, id: string): Promise<ReportRecord>;
  list(scope: Scope, first: number, after: string | null): Promise<ReportRecord[]>;
}
export interface ReportSources {
  authorize(actor: Actor, caseId: string, generate: boolean): Promise<{ initialAgentId: string }>;
  gather(actor: Actor, caseId: string, input: ReportInput): Promise<{ data: unknown; sources: ReportContent['sources'] }>;
}
export interface ReportProposer { propose(actor: Actor, caseId: string, input: ReportInput, context: { data: unknown; sources: ReportContent['sources'] }): Promise<unknown> }
export interface ReportRenderer { render(content: ReportContent, executive: boolean): Promise<Buffer> }