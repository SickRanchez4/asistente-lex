import { Component, signal } from '@angular/core';
import { formatBOB, formatCivilDate, formatEventDateTime } from '../../../shared/formats';
import { feedbackForOutcome } from '../../../shared/presentation';
import { previewAgents, previewFeedback, previewRecoverable } from '../../../shared/preview';
import { ActionButton, AgentSelect, ConfirmationDialog, OfflineIndicator, ReadOnlyNotice, StatusNotice, TextField } from './ui.components';

@Component({
  selector: 'al-ui-preview',
  imports: [ActionButton, AgentSelect, ConfirmationDialog, OfflineIndicator, ReadOnlyNotice, StatusNotice, TextField],
  template: `<details class="al-preview"><summary>Patrones compartidos · solo desarrollo</summary><div class="al-preview-content">
    <p class="al-muted">Escenarios locales de presentación. No reflejan sesión, agentes ni conexión reales y no ejecutan operaciones de negocio.</p>
    <fieldset><legend>Estados de una operación</legend><div class="al-toolbar">@for (option of examples; track $index) {
      <button type="button" class="al-button al-button--secondary" [attr.aria-pressed]="feedback() === option" (click)="feedback.set(option)">{{ option.title }}</button>
    }</div></fieldset>
    <al-status-notice [feedback]="feedback()" [retryAvailable]="feedback() === recoverable || feedback().kind === 'unavailable'" (retry)="feedback.set(examples[0])" />
    <h2>Formulario y elementos no disponibles</h2>
    <al-text-field controlId="angular-preview-field" label="Dato de ejemplo" [value]="value()" (valueChange)="value.set($event)" [error]="error()" hint="El valor se conserva cuando se muestra un error." />
    <button type="button" class="al-button al-button--secondary" (click)="error.set('Revisa el dato del ejemplo.')">Mostrar error de campo</button>
    <al-agent-select controlId="angular-preview-agent" label="Agentes de ejemplo" [value]="agent()" [options]="agents" (valueChange)="agent.set($event)" />
    <al-read-only-notice state="Cerrado" /><al-offline-indicator connectivity="offline" />
    <al-action-button controlId="angular-preview-unavailable" label="Acción no disponible" [reasons]="reasons" />
    <al-action-button controlId="angular-preview-pending" label="Operación de ejemplo" [pending]="true" />
    <h2>Confirmación explícita</h2>
    <al-action-button controlId="angular-preview-confirm" label="Abrir confirmación de ejemplo" (activate)="open.set(true)" />
    <al-confirmation-dialog controlId="angular-preview-dialog" [open]="open()" title="Confirmación de ejemplo" confirmLabel="Confirmar ejemplo"
      consequences="Una acción irreversible debe explicar sus consecuencias. Este ejemplo no archiva expedientes ni elimina copias."
      (cancel)="open.set(false)" (confirm)="confirmExample()" />
    <h2>Formatos exactos</h2>
    <dl><dt>Fecha civil</dt><dd>{{ civil }}</dd><dt>Evento en Bolivia</dt><dd>{{ event }}</dd>
      <dt>Importe BOB</dt><dd>{{ amount }}</dd><dt>Importe grande</dt><dd>{{ largeAmount }}</dd></dl>
  </div></details>`,
})
export class UiPreview {
  readonly examples = previewFeedback;
  readonly recoverable = previewRecoverable;
  readonly agents = previewAgents;
  readonly feedback = signal(previewFeedback[0]);
  readonly value = signal('Datos que se conservan');
  readonly error = signal('');
  readonly agent = signal('penalista');
  readonly open = signal(false);
  readonly reasons = ['Contenido jurídico de solo lectura.', 'No disponible sin conexión.'];
  readonly civil = formatCivilDate('2026-11-08');
  readonly event = formatEventDateTime('2026-11-08T22:53:00Z');
  readonly amount = formatBOB('1234.56');
  readonly largeAmount = formatBOB('9007199254740993.01');
  confirmExample(): void {
    this.open.set(false);
    this.feedback.set(feedbackForOutcome({ kind: 'unconfirmed' }));
  }
}
