import { Component, OnDestroy, signal } from '@angular/core';
import { ConfirmationDialog, StatusNotice } from './ui.components';
import { GraphqlFailure, requestGraphql } from '../../../shared/graphql';
import { feedbackForError, feedbackForOutcome, type ErrorCategory, type Feedback } from '../../../shared/presentation';
import { formatEventDateTime } from '../../../shared/formats';

interface Agent {
  id: string; name: string; specialty: string; enabled: boolean; revision: string;
  instructions: string; model: string; tools: string[]; authorId: string | null; occurredAt: string;
}
interface ConfigurationInput { expectedRevision: string; instructions: string; model: string; tools: string[] }
interface HistoryPage { items: { current: Agent; previous: Agent | null }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }
interface Change { applied: boolean; auditRecorded: boolean; category: string | null; message: string; agent: Agent }
type Pending = { kind: 'configuration'; agent: Agent; input: ConfigurationInput } | { kind: 'enabled'; agent: Agent };
const fields = 'id name specialty enabled revision instructions model tools authorId occurredAt';
const outcome = `applied auditRecorded category message agent{${fields}}`;

@Component({ selector: 'al-agent-administration', imports: [StatusNotice, ConfirmationDialog], templateUrl: './agents.html' })
export class AgentAdministration implements OnDestroy {
  readonly agents = signal<Agent[]>([]);
  readonly selectedId = signal('penalista');
  readonly feedback = signal<Feedback | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly requiresRefresh = signal(false);
  readonly pending = signal<Pending | null>(null);
  readonly history = signal<HistoryPage['items']>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal(false);
  readonly historyPage = signal(1);
  readonly more = signal(false);
  readonly tools = [
    { id: 'CASE_LEGAL_DATA', label: 'Datos juridicos permitidos del expediente' },
    { id: 'CASE_PDF_LIST', label: 'Listado de PDF del expediente' },
    { id: 'CASE_PDF_TEXT', label: 'Texto de un PDF autorizado' },
  ];
  readonly date = formatEventDateTime;
  private readonly controller = new AbortController();
  private alive = true;
  private historyVersion = 0;
  private cursors: (string | null)[] = [null];
  private nextCursor: string | null = null;

  constructor() { void this.reload(); }
  ngOnDestroy(): void { this.alive = false; this.controller.abort(); }
  selected(): Agent | undefined { return this.agents().find(agent => agent.id === this.selectedId()); }
  private request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    return requestGraphql<T>(query, variables, this.controller.signal);
  }
  private fail(error: unknown, mutation = false): void {
    if (!this.alive) return;
    if (mutation && (!(error instanceof GraphqlFailure) || error.uncertain)) {
      this.requiresRefresh.set(true); this.feedback.set(feedbackForOutcome({ kind: 'unconfirmed' })); return;
    }
    const categories: Record<string, ErrorCategory> = { VALIDATION: 'validation', UNAUTHENTICATED: 'unauthenticated', FORBIDDEN: 'forbidden', NOT_FOUND: 'not-found', CONFLICT: 'conflict', SERVICE_UNAVAILABLE: 'unavailable' };
    const base = feedbackForError(error instanceof GraphqlFailure ? categories[error.category] ?? 'unexpected' : 'unexpected');
    if (mutation && error instanceof GraphqlFailure && error.category === 'CONFLICT') this.requiresRefresh.set(true);
    this.feedback.set({ ...base, message: error instanceof GraphqlFailure ? error.message : base.message });
  }
  async reload(): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.loading.set(true);
    try {
      const data = await this.request<{ adminAgents: Agent[] }>(`{adminAgents{${fields}}}`);
      if (!this.alive) return;
      this.agents.set(data.adminAgents); this.requiresRefresh.set(false);
      this.resetHistory(); await this.loadHistory();
    } catch (error) { this.agents.set([]); this.history.set([]); this.fail(error); }
    finally { if (this.alive) this.loading.set(false); }
  }
  async select(id: string): Promise<void> {
    if (this.busy() || this.loading() || this.pending()) return;
    this.selectedId.set(id); this.resetHistory(); await this.loadHistory();
  }
  beginConfiguration(event: SubmitEvent): void {
    event.preventDefault();
    const agent = this.selected();
    if (!agent || this.busy() || this.requiresRefresh()) return;
    const values = new FormData(event.target as HTMLFormElement);
    this.pending.set({ kind: 'configuration', agent,
      input: { expectedRevision: agent.revision, instructions: String(values.get('instructions') ?? ''),
        model: String(values.get('model') ?? ''), tools: values.getAll('tools').map(String) } });
  }
  beginEnabled(): void {
    const agent = this.selected();
    if (agent && !this.busy() && !this.requiresRefresh()) this.pending.set({ kind: 'enabled', agent });
  }
  consequences(): string {
    const change = this.pending();
    if (!change) return '';
    if (change.kind === 'configuration') return 'La nueva revision se usara para preguntas posteriores. Se conservaran los valores anteriores, el autor y la fecha.';
    if (!change.agent.enabled) return 'El agente volvera a estar disponible para nuevas preguntas y expedientes. Se conservara su historial.';
    const last = this.agents().filter(agent => agent.id !== change.agent.id).every(agent => !agent.enabled);
    return 'No admitira nuevas preguntas ni expedientes. Las preguntas ya iniciadas pueden terminar, salvo archivo del expediente.'
      + (last ? ' Ambos agentes quedaran deshabilitados: no se podran crear expedientes ni enviar nuevas preguntas.' : '');
  }
  async confirm(): Promise<void> {
    const pending = this.pending();
    if (!pending || this.busy()) return;
    this.busy.set(true); this.feedback.set(null);
    try {
      const data = pending.kind === 'configuration'
        ? await this.request<{ updateAgentConfiguration: Change }>(`mutation($id:ID!,$input:AgentConfigurationInput!){updateAgentConfiguration(id:$id,input:$input){${outcome}}}`, { id: pending.agent.id, input: pending.input })
        : await this.request<{ setAgentEnabled: Change }>(`mutation($id:ID!,$revision:ID!,$enabled:Boolean!){setAgentEnabled(id:$id,expectedRevision:$revision,enabled:$enabled){${outcome}}}`, { id: pending.agent.id, revision: pending.agent.revision, enabled: !pending.agent.enabled });
      if (!this.alive) return;
      const result = Object.values(data)[0];
      if (!result.applied) throw new Error('Unconfirmed agent change');
      this.agents.update(agents => agents.map(agent => agent.id === result.agent.id ? result.agent : agent));
      this.feedback.set(feedbackForOutcome(result.auditRecorded ? { kind: 'confirmed', message: 'Cambio aplicado y auditoria registrada.' }
        : { kind: 'partial', message: result.message }));
      window.dispatchEvent(new CustomEvent('al-agents-changed'));
      if (typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel('al-agents'); channel.postMessage('changed'); channel.close(); }
      this.resetHistory(); await this.loadHistory();
    } catch (error) { this.fail(error, true); }
    finally { if (this.alive) { this.busy.set(false); this.pending.set(null); } }
  }
  private resetHistory(): void {
    ++this.historyVersion; this.history.set([]); this.historyError.set(false); this.historyPage.set(1);
    this.cursors = [null]; this.nextCursor = null; this.more.set(false);
  }
  async loadHistory(): Promise<void> {
    const version = ++this.historyVersion, id = this.selectedId();
    this.historyLoading.set(true); this.historyError.set(false);
    try {
      const data = await this.request<{ adminAgentHistory: HistoryPage }>(`query($id:ID!,$after:String){adminAgentHistory(id:$id,first:10,after:$after){items{current{${fields}} previous{${fields}}} pageInfo{hasNextPage endCursor}}}`, { id, after: this.cursors[this.historyPage() - 1] });
      if (!this.alive || version !== this.historyVersion) return;
      this.history.set(data.adminAgentHistory.items); this.more.set(data.adminAgentHistory.pageInfo.hasNextPage);
      this.nextCursor = data.adminAgentHistory.pageInfo.endCursor;
    } catch { if (this.alive && version === this.historyVersion) { this.history.set([]); this.more.set(false); this.historyError.set(true); } }
    finally { if (this.alive && version === this.historyVersion) this.historyLoading.set(false); }
  }
  async turn(direction: number): Promise<void> {
    if (this.historyLoading() || this.busy()) return;
    if (direction > 0) { if (!this.more() || !this.nextCursor) return; this.cursors[this.historyPage()] = this.nextCursor; }
    else if (this.historyPage() === 1) return;
    this.historyPage.update(value => value + direction); await this.loadHistory();
  }
  toolLabels(tools: string[]): string { return tools.map(id => this.tools.find(tool => tool.id === id)?.label ?? id).join(', ') || 'Ninguna'; }
}