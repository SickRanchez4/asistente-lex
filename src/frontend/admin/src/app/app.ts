import { Component, OnDestroy, inject, signal } from '@angular/core';
import { navigateToUrl } from 'single-spa';
import { ConfirmationDialog, StatusNotice } from './ui.components';
import { UiErrorHandler } from './ui-error-handler';
import { GraphqlFailure, requestGraphql } from '../../../shared/graphql';
import { feedbackForError, feedbackForOutcome, type Feedback, type ErrorCategory } from '../../../shared/presentation';
import { formatEventDateTime } from '../../../shared/formats';
import { AgentAdministration } from './agents';

interface Account { id: string; name: string; email: string; enabled: boolean }
interface Settings { globalMessage: string; supportEmail: string }
interface Page<T> { items: T[]; pageInfo: { endCursor: string | null; hasNextPage: boolean } }
interface AuditEvent { id: string; type: string; date: string; userId: string | null; result: string; operation: string | null; targetId: string | null; parameter: string | null; previousValue: string | null; newValue: string | null; agentId: string | null }
interface Change { applied: boolean; auditRecorded: boolean; category: string | null; message: string | null; account: Account | null; settings: Settings | null }
type Tab = 'cuentas' | 'parametros' | 'auditoria' | 'agentes';
const accountFields = 'id name email enabled';
const changeFields = `applied auditRecorded category message account { ${accountFields} } settings { globalMessage supportEmail }`;

@Component({ selector: 'al-root', imports: [StatusNotice, ConfirmationDialog, AgentAdministration], templateUrl: './app.html' })
export class App implements OnDestroy {
  readonly errors = inject(UiErrorHandler);
  readonly tab = signal<Tab>('cuentas');
  readonly feedback = signal<Feedback | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly accounts = signal<Account[]>([]);
  readonly selected = signal<Account | null>(null);
  readonly settings = signal<Settings>({ globalMessage: '', supportEmail: '' });
  readonly events = signal<AuditEvent[]>([]);
  readonly more = signal(false);
  readonly pageNumber = signal(1);
  readonly confirmation = signal<'enabled' | 'password' | null>(null);
  readonly eventTypes = [
    ['LOGIN', 'Inicio de sesión'], ['LOGIN_FAILED', 'Intento fallido'], ['LOGOUT', 'Cierre de sesión'],
    ['ACCESS_DENIED', 'Denegación'], ['PASSWORD_CHANGED', 'Cambio de contraseña'], ['ADMIN_CHANGE', 'Cambio administrativo'],
    ['AGENT_ACTION', 'Acción sobre agente'], ['AI_ACTION', 'Acción de IA'],
  ];
  readonly eventDate = formatEventDateTime;
  private readonly controller = new AbortController();
  private alive = true;
  private readVersion = 0;
  private cursors: (string | null)[] = [null];
  private nextCursor: string | null = null;
  private filters: Record<string, string> = {};
  private pendingPassword = '';
  private readonly routing = () => { if (!this.busy()) void this.openPath(); };

  constructor() {
    window.addEventListener('single-spa:routing-event', this.routing);
    void this.openPath();
  }
  ngOnDestroy(): void {
    this.alive = false; this.controller.abort(); this.pendingPassword = '';
    window.removeEventListener('single-spa:routing-event', this.routing);
  }
  private async openPath(): Promise<void> {
    const path = location.pathname.split('/')[2];
    const next: Tab = path === 'parametros' || path === 'auditoria' || path === 'agentes' ? path : 'cuentas';
    if (next !== this.tab() || !this.readVersion) {
      this.tab.set(next); this.selected.set(null); this.feedback.set(null); this.resetPages();
      await this.reload();
    }
  }
  navigate(event: MouseEvent, tab: Tab): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!this.busy()) navigateToUrl(`/admin/${tab}`);
  }
  private request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    return requestGraphql<T>(query, variables, this.controller.signal);
  }
  private fail(error: unknown, mutation = false): void {
    if (!this.alive) return;
    if (mutation && (!(error instanceof GraphqlFailure) || error.uncertain)) {
      this.feedback.set(feedbackForOutcome({ kind: 'unconfirmed' })); return;
    }
    const mapping: Record<string, ErrorCategory> = { VALIDATION: 'validation', UNAUTHENTICATED: 'unauthenticated', FORBIDDEN: 'forbidden', NOT_FOUND: 'not-found', CONFLICT: 'conflict', SERVICE_UNAVAILABLE: 'unavailable' };
    const base = feedbackForError(error instanceof GraphqlFailure ? mapping[error.category] ?? 'unexpected' : 'unexpected');
    this.feedback.set({ ...base, message: error instanceof GraphqlFailure ? error.message : base.message });
  }
  private resetPages(): void { this.cursors = [null]; this.nextCursor = null; this.pageNumber.set(1); this.more.set(false); }
  async reload(): Promise<void> {
    const version = ++this.readVersion;
    this.loading.set(true); this.more.set(false);
    if (this.tab() === 'agentes') { this.loading.set(false); return; }
    const after = this.cursors[this.pageNumber() - 1];
    try {
      if (this.tab() === 'cuentas') {
        const data = await this.request<{ adminAccounts: Page<Account> }>(`query($after:String){adminAccounts(first:25,after:$after){items{${accountFields}} pageInfo{endCursor hasNextPage}}}`, { after });
        if (!this.alive || version !== this.readVersion) return;
        this.accounts.set(data.adminAccounts.items); this.page(data.adminAccounts.pageInfo);
      } else if (this.tab() === 'parametros') {
        const data = await this.request<{ applicationSettings: Settings }>('{applicationSettings{globalMessage supportEmail}}');
        if (!this.alive || version !== this.readVersion) return;
        this.settings.set(data.applicationSettings);
      } else {
        const data = await this.request<{ adminAuditEvents: Page<AuditEvent> }>(`query($filter:AuditFilter,$after:String){adminAuditEvents(filter:$filter,first:25,after:$after){items{id type date userId result operation targetId parameter previousValue newValue agentId} pageInfo{endCursor hasNextPage}}}`, { filter: this.filters, after });
        if (!this.alive || version !== this.readVersion) return;
        this.events.set(data.adminAuditEvents.items); this.page(data.adminAuditEvents.pageInfo);
      }
    } catch (error) {
      if (version === this.readVersion) {
        this.accounts.set([]); this.events.set([]);
        const previous = this.feedback();
        if (previous?.kind === 'partial' || previous?.kind === 'success') {
          this.feedback.set({ ...previous, message: `${previous.message} No se pudo actualizar la vista; consulta su estado antes de continuar.` });
        } else this.fail(error);
      }
    }
    finally { if (this.alive && version === this.readVersion) this.loading.set(false); }
  }
  private page(info: Page<unknown>['pageInfo']): void { this.more.set(info.hasNextPage); this.nextCursor = info.endCursor; }
  async turn(direction: number): Promise<void> {
    if (this.loading() || this.busy()) return;
    if (direction > 0) { if (!this.more() || !this.nextCursor) return; this.cursors[this.pageNumber()] = this.nextCursor; }
    else if (this.pageNumber() === 1) return;
    this.pageNumber.update(value => value + direction); await this.reload();
  }
  async detail(id: string): Promise<void> {
    if (this.busy() || this.loading()) return;
    this.loading.set(true);
    try {
      const data = await this.request<{ adminAccount: Account }>(`query($id:ID!){adminAccount(id:$id){${accountFields}}}`, { id });
      if (this.alive) this.selected.set(data.adminAccount);
    } catch (error) { this.selected.set(null); this.fail(error); }
    finally { if (this.alive) this.loading.set(false); }
  }
  private async mutate(query: string, variables: Record<string, unknown>): Promise<Change | null> {
    if (this.busy()) return null;
    this.busy.set(true); this.feedback.set(null);
    try {
      const data = await this.request<Record<string, Change>>(query, variables);
      if (!this.alive) return null;
      const result = Object.values(data)[0];
      if (!result.applied) throw new Error('Unconfirmed change');
      this.feedback.set(feedbackForOutcome(result.auditRecorded ? { kind: 'confirmed', message: 'Cambio aplicado y auditoría registrada.' }
        : { kind: 'partial', message: result.message ?? 'Cambio aplicado; auditoría no registrada. No repitas el cambio.' }));
      if (result.account) this.selected.set(result.account);
      if (result.settings) { this.settings.set(result.settings); window.dispatchEvent(new CustomEvent('al-settings-changed')); }
      return result;
    } catch (error) { this.fail(error, true); return null; }
    finally { if (this.alive) this.busy.set(false); }
  }
  async create(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement, values = new FormData(form);
    const result = await this.mutate(`mutation($name:String!,$email:String!,$password:String!){createLawyerAccount(name:$name,email:$email,password:$password){${changeFields}}}`,
      { name: values.get('name'), email: values.get('email'), password: values.get('password') });
    this.clearSecrets(form);
    if (result) { form.reset(); this.resetPages(); await this.reload(); }
  }
  beginReset(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement, values = new FormData(form);
    const password = String(values.get('password'));
    if (password !== values.get('confirmation')) { this.feedback.set({ kind: 'error', title: 'Revisa los datos', message: 'Las contraseñas no coinciden.' }); return; }
    if (new TextEncoder().encode(password).length > 72) { this.feedback.set({ kind: 'error', title: 'Revisa los datos', message: 'La contraseña supera los 72 bytes permitidos.' }); return; }
    this.pendingPassword = password; this.clearSecrets(form); this.confirmation.set('password');
  }
  cancel(): void { if (!this.busy()) { this.pendingPassword = ''; this.confirmation.set(null); } }
  async confirm(): Promise<void> {
    const account = this.selected(), action = this.confirmation();
    if (!account || !action || this.busy()) return;
    try {
      const query = action === 'password'
        ? `mutation($id:ID!,$password:String!){resetLawyerPassword(id:$id,password:$password){${changeFields}}}`
        : `mutation($id:ID!,$enabled:Boolean!){setLawyerAccountEnabled(id:$id,enabled:$enabled){${changeFields}}}`;
      const result = await this.mutate(query, action === 'password' ? { id: account.id, password: this.pendingPassword } : { id: account.id, enabled: !account.enabled });
      if (result) await this.reload();
    } finally { this.pendingPassword = ''; this.confirmation.set(null); }
  }
  async saveSetting(event: SubmitEvent, key: string): Promise<void> {
    event.preventDefault();
    const values = new FormData(event.target as HTMLFormElement);
    await this.mutate(`mutation($key:ApplicationSettingKey!,$value:String!){updateApplicationSetting(key:$key,value:$value){${changeFields}}}`, { key, value: values.get('value') });
  }
  async filter(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const values = new FormData(event.target as HTMLFormElement);
    const next: Record<string, string> = {};
    for (const key of ['type', 'userId', 'from', 'until']) {
      const value = String(values.get(key) ?? '').trim();
      if (value) next[key] = key === 'from' || key === 'until' ? new Date(value).toISOString() : value;
    }
    this.filters = next; this.feedback.set(null); this.resetPages(); await this.reload();
  }
  typeLabel(type: string): string { return this.eventTypes.find(option => option[0] === type)?.[1] ?? type; }
  private clearSecrets(form: HTMLFormElement): void { form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => { input.value = ''; }); }
}
