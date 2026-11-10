import { useEffect, useRef, useState, type ChangeEventHandler, type HTMLInputTypeAttribute } from 'react';
import { feedbackAllowsRetry, feedbackRole, readOnlyMessage, type AgentOption, type CaseState, type Connectivity, type Feedback } from '../../shared/presentation';
import { isNavigationActive, navigationForSession, type NavigationItem, type SessionPresentation } from '../../shared/navigation';

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

export function StatusNotice({ feedback, onRetry }: { feedback: Feedback; onRetry?: () => void }) {
  return (
    <section className="al-status" data-kind={feedback.kind} role={feedbackRole(feedback)} aria-busy={feedback.kind === 'loading'}>
      <h2>{feedback.title}</h2>
      <p>{feedback.message}</p>
      {onRetry && feedbackAllowsRetry(feedback) && <button type="button" className="al-button al-button--secondary" onClick={onRetry}>Reintentar</button>}
    </section>
  );
}

export function OfflineIndicator({ connectivity }: { connectivity: Connectivity }) {
  return connectivity === 'offline' ? <p className="al-notice" role="status">Sin conexión: consulta de solo lectura. Escrituras, chat e informes no disponibles sin conexión.</p> : null;
}

export function ReadOnlyNotice({ state }: { state: CaseState }) {
  const message = readOnlyMessage(state);
  return message ? <p className="al-notice" role="status">{message}</p> : null;
}

export function ActionButton({ id, label, reasons = [], pending = false, onClick, type = 'button' }: {
  id: string; label: string; reasons?: readonly string[]; pending?: boolean; onClick?: () => void; type?: 'button' | 'submit';
}) {
  return (
    <div>
      <button id={id} type={type} className="al-button" disabled={pending || reasons.length > 0}
        aria-busy={pending} aria-describedby={reasons.length ? `${id}-reasons` : undefined} onClick={onClick}>
        {pending ? 'Operación en curso…' : label}
      </button>
      {reasons.length > 0 && <ul id={`${id}-reasons`} className="al-reasons">{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
    </div>
  );
}

export function TextField({ id, label, value, onChange, error, hint, type = 'text', required = false, autoComplete }: {
  id: string; label: string; value: string; onChange: ChangeEventHandler<HTMLInputElement>; error?: string; hint?: string;
  type?: HTMLInputTypeAttribute; required?: boolean; autoComplete?: string;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="al-field">
      <label htmlFor={id}>{label}{required ? ' (obligatorio)' : ''}</label>
      <input id={id} name={id} className="al-input" type={type} value={value} onChange={onChange} required={required}
        autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      {hint && <p id={`${id}-hint`} className="al-field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="al-field-error">{error}</p>}
    </div>
  );
}

export function AgentSelect({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: readonly AgentOption[]; onChange: ChangeEventHandler<HTMLSelectElement>;
}) {
  const unavailable = options.filter((option) => !option.available);
  return (
    <div className="al-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} className="al-input" value={value} onChange={onChange} aria-describedby={unavailable.length ? `${id}-reasons` : undefined}>
        <option value="" disabled>Selecciona un agente habilitado</option>
        {options.map((option) => <option key={option.id} value={option.id} disabled={!option.available}>
          {option.name}{option.available ? '' : ' — No disponible: agente deshabilitado'}
        </option>)}
      </select>
      {unavailable.length > 0 && <ul id={`${id}-reasons`} className="al-reasons">{unavailable.map((option) => <li key={option.id}>{option.name}: agente deshabilitado, no seleccionable.</li>)}</ul>}
    </div>
  );
}

export function ConfirmationDialog({ id, open, title, consequences, confirmLabel, pending = false, onConfirm, onCancel }: {
  id: string; open: boolean; title: string; consequences: string; confirmLabel: string; pending?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => {
      if (element.open) element.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  return (
    <dialog ref={dialog} id={id} className="al-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-consequences`}
      onCancel={(event) => { event.preventDefault(); if (!pending) onCancel(); }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); if (!pending) onCancel(); } }}>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-consequences`}>{consequences}</p>
      {pending && <p role="status">Operación en curso; el resultado aún no está confirmado.</p>}
      <div className="al-toolbar">
        <button type="button" className="al-button al-button--secondary" autoFocus disabled={pending} onClick={onCancel}>Cancelar</button>
        <button type="button" className="al-button al-button--danger" disabled={pending} onClick={onConfirm}>{pending ? 'Operación en curso…' : confirmLabel}</button>
      </div>
    </dialog>
  );
}

export function AppNavigation({ session, items, currentPath }: { session: SessionPresentation; items: readonly NavigationItem[]; currentPath: string }) {
  const visible = navigationForSession(session, items);
  if (!visible.length) return null;
  return <nav className="al-nav" aria-label="Secciones">{visible.map((item) => <a key={item.key} href={item.href}
    aria-current={isNavigationActive(item.href, currentPath) ? 'page' : undefined}>{item.label}</a>)}</nav>;
}
