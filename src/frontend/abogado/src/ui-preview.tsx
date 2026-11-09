import { useState } from 'react';
import { formatBOB, formatCivilDate, formatEventDateTime } from '../../shared/formats';
import { feedbackForOutcome } from '../../shared/presentation';
import { previewAgents, previewFeedback, previewRecoverable } from '../../shared/preview';
import { ActionButton, AgentSelect, ConfirmationDialog, OfflineIndicator, ReadOnlyNotice, StatusNotice, TextField } from './ui';

export default function UiPreview() {
  const [feedback, setFeedback] = useState(previewFeedback[0]);
  const [value, setValue] = useState('Datos que se conservan');
  const [error, setError] = useState('');
  const [agent, setAgent] = useState('penalista');
  const [open, setOpen] = useState(false);
  return (
    <details className="al-preview">
      <summary>Patrones compartidos · solo desarrollo</summary>
      <div className="al-preview-content">
        <p className="al-muted">Escenarios locales de presentación. No reflejan sesión, agentes ni conexión reales y no ejecutan operaciones de negocio.</p>
        <fieldset><legend>Estados de una operación</legend><div className="al-toolbar">
          {previewFeedback.map((option, index) => <button type="button" className="al-button al-button--secondary" key={index}
            aria-pressed={feedback === option} onClick={() => setFeedback(option)}>{option.title}</button>)}
        </div></fieldset>
        <StatusNotice feedback={feedback} onRetry={feedback === previewRecoverable || feedback.kind === 'unavailable' ? () => setFeedback(previewFeedback[0]) : undefined} />
        <h2>Formulario y elementos no disponibles</h2>
        <TextField id="react-preview-field" label="Dato de ejemplo" value={value} onChange={(event) => setValue(event.currentTarget.value)}
          error={error} hint="El valor se conserva cuando se muestra un error." />
        <button type="button" className="al-button al-button--secondary" onClick={() => setError('Revisa el dato del ejemplo.')}>Mostrar error de campo</button>
        <AgentSelect id="react-preview-agent" label="Agentes de ejemplo" value={agent} options={previewAgents} onChange={(event) => setAgent(event.currentTarget.value)} />
        <ReadOnlyNotice state="Cerrado" />
        <OfflineIndicator connectivity="offline" />
        <ActionButton id="react-preview-unavailable" label="Acción no disponible" reasons={['Contenido jurídico de solo lectura.', 'No disponible sin conexión.']} />
        <ActionButton id="react-preview-pending" label="Operación de ejemplo" pending />
        <h2>Confirmación explícita</h2>
        <ActionButton id="react-preview-confirm" label="Abrir confirmación de ejemplo" onClick={() => setOpen(true)} />
        <ConfirmationDialog id="react-preview-dialog" open={open} title="Confirmación de ejemplo" confirmLabel="Confirmar ejemplo"
          consequences="Una acción irreversible debe explicar sus consecuencias. Este ejemplo no archiva expedientes ni elimina copias."
          onCancel={() => setOpen(false)} onConfirm={() => { setOpen(false); setFeedback(feedbackForOutcome({ kind: 'unconfirmed' })); }} />
        <h2>Formatos exactos</h2>
        <dl><dt>Fecha civil</dt><dd>{formatCivilDate('2026-11-08')}</dd>
          <dt>Evento en Bolivia</dt><dd>{formatEventDateTime('2026-11-08T22:53:00Z')}</dd>
          <dt>Importe BOB</dt><dd>{formatBOB('1234.56')}</dd>
          <dt>Importe grande</dt><dd>{formatBOB('9007199254740993.01')}</dd></dl>
      </div>
    </details>
  );
}
