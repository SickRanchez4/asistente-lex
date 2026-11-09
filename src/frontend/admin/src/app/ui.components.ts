import { Component, ElementRef, computed, effect, input, output, viewChild } from '@angular/core';
import { feedbackAllowsRetry, feedbackRole, readOnlyMessage, type AgentOption, type CaseState, type Connectivity, type Feedback } from '../../../shared/presentation';
import { isNavigationActive, navigationForSession, type NavigationItem, type SessionPresentation } from '../../../shared/navigation';

@Component({
  selector: 'al-status-notice',
  template: `<section class="al-status" [attr.data-kind]="feedback().kind" [attr.role]="role()" [attr.aria-busy]="feedback().kind === 'loading'">
    <h2>{{ feedback().title }}</h2><p>{{ feedback().message }}</p>
    @if (retryAvailable() && allowsRetry()) { <button type="button" class="al-button al-button--secondary" (click)="retry.emit()">Reintentar</button> }
  </section>`,
})
export class StatusNotice {
  readonly feedback = input.required<Feedback>();
  readonly retryAvailable = input(false);
  readonly retry = output<void>();
  readonly role = computed(() => feedbackRole(this.feedback()));
  readonly allowsRetry = computed(() => feedbackAllowsRetry(this.feedback()));
}

@Component({
  selector: 'al-offline-indicator',
  template: `@if (connectivity() === 'offline') { <p class="al-notice" role="status">Sin conexión: consulta de solo lectura. Escrituras, chat e informes no disponibles sin conexión.</p> }`,
})
export class OfflineIndicator { readonly connectivity = input.required<Connectivity>(); }

@Component({
  selector: 'al-read-only-notice',
  template: `@if (message(); as text) { <p class="al-notice" role="status">{{ text }}</p> }`,
})
export class ReadOnlyNotice {
  readonly state = input.required<CaseState>();
  readonly message = computed(() => readOnlyMessage(this.state()));
}

@Component({
  selector: 'al-action-button',
  template: `<button [id]="id()" [type]="type()" class="al-button" [disabled]="pending() || reasons().length > 0"
    [attr.aria-busy]="pending()" [attr.aria-describedby]="reasons().length ? id() + '-reasons' : null" (click)="activate.emit()">
    {{ pending() ? 'Operación en curso…' : label() }}</button>
    @if (reasons().length) { <ul [id]="id() + '-reasons'" class="al-reasons">@for (reason of reasons(); track $index) { <li>{{ reason }}</li> }</ul> }`,
})
export class ActionButton {
  readonly id = input.required<string>({ alias: 'controlId' });
  readonly label = input.required<string>();
  readonly type = input<'button' | 'submit'>('button');
  readonly pending = input(false);
  readonly reasons = input<readonly string[]>([]);
  readonly activate = output<void>();
}

@Component({
  selector: 'al-text-field',
  template: `<div class="al-field">
    <label [for]="id()">{{ label() }}{{ required() ? ' (obligatorio)' : '' }}</label>
    <input [id]="id()" [name]="id()" class="al-input" [type]="type()" [value]="value()" [required]="required()"
      [attr.autocomplete]="autoComplete()" [attr.aria-invalid]="!!error()" [attr.aria-describedby]="describedBy()" (input)="changeValue($event)" />
    @if (hint()) { <p [id]="id() + '-hint'" class="al-field-hint">{{ hint() }}</p> }
    @if (error()) { <p [id]="id() + '-error'" class="al-field-error">{{ error() }}</p> }
  </div>`,
})
export class TextField {
  readonly id = input.required<string>({ alias: 'controlId' });
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly valueChange = output<string>();
  readonly type = input('text');
  readonly required = input(false);
  readonly autoComplete = input<string | null>(null);
  readonly error = input('');
  readonly hint = input('');
  readonly describedBy = computed(() => [this.hint() && this.id() + '-hint', this.error() && this.id() + '-error'].filter(Boolean).join(' ') || null);
  changeValue(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) throw new Error('No se pudo leer el campo del formulario.');
    this.valueChange.emit(event.target.value);
  }
}

@Component({
  selector: 'al-agent-select',
  template: `<div class="al-field"><label [for]="id()">{{ label() }}</label>
    <select [id]="id()" [name]="id()" class="al-input" [value]="value()" [attr.aria-describedby]="unavailable().length ? id() + '-reasons' : null" (change)="changeValue($event)">
      <option value="" disabled [selected]="!value()">Selecciona un agente habilitado</option>
      @for (option of options(); track option.id) { <option [value]="option.id" [selected]="option.id === value()" [disabled]="!option.available">{{ option.name }}{{ option.available ? '' : ' — No disponible: agente deshabilitado' }}</option> }
    </select>
    @if (unavailable().length) { <ul [id]="id() + '-reasons'" class="al-reasons">@for (option of unavailable(); track option.id) { <li>{{ option.name }}: agente deshabilitado, no seleccionable.</li> }</ul> }
  </div>`,
})
export class AgentSelect {
  readonly id = input.required<string>({ alias: 'controlId' });
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly options = input.required<readonly AgentOption[]>();
  readonly valueChange = output<string>();
  readonly unavailable = computed(() => this.options().filter((option) => !option.available));
  changeValue(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) throw new Error('No se pudo leer la selección del agente.');
    this.valueChange.emit(event.target.value);
  }
}

@Component({
  selector: 'al-confirmation-dialog',
  template: `<dialog #dialog [id]="id()" class="al-dialog" [attr.aria-labelledby]="id() + '-title'" [attr.aria-describedby]="id() + '-consequences'" (cancel)="cancelDialog($event)" (keydown.escape)="cancelDialog($event)">
    <h2 [id]="id() + '-title'">{{ title() }}</h2><p [id]="id() + '-consequences'">{{ consequences() }}</p>
    @if (pending()) { <p role="status">Operación en curso; el resultado aún no está confirmado.</p> }
    <div class="al-toolbar">
      <button type="button" class="al-button al-button--secondary" autofocus [disabled]="pending()" (click)="cancel.emit()">Cancelar</button>
      <button type="button" class="al-button al-button--danger" [disabled]="pending()" (click)="confirm.emit()">{{ pending() ? 'Operación en curso…' : confirmLabel() }}</button>
    </div></dialog>`,
})
export class ConfirmationDialog {
  readonly id = input.required<string>({ alias: 'controlId' });
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly consequences = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly pending = input(false);
  readonly confirm = output<void>();
  readonly cancel = output<void>();
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    effect((onCleanup) => {
      const element = this.dialog()?.nativeElement;
      const open = this.open();
      if (!element || !open) return;
      const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
      onCleanup(() => {
        if (element.open) element.close();
        if (previousFocus?.isConnected) previousFocus.focus();
      });
    });
  }
  cancelDialog(event: Event): void {
    event.preventDefault();
    if (!this.pending()) this.cancel.emit();
  }
}

@Component({
  selector: 'al-app-navigation',
  template: `@if (visible().length) { <nav class="al-nav" aria-label="Secciones">@for (item of visible(); track item.key) {
    <a [href]="item.href" [attr.aria-current]="active(item.href, currentPath()) ? 'page' : null">{{ item.label }}</a>
  }</nav> }`,
})
export class AppNavigation {
  readonly session = input.required<SessionPresentation>();
  readonly items = input.required<readonly NavigationItem[]>();
  readonly currentPath = input.required<string>();
  readonly visible = computed(() => navigationForSession(this.session(), this.items()));
  readonly active = isNavigationActive;
}
