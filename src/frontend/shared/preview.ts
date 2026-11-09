import { feedbackForError, feedbackForOutcome, type AgentOption, type Feedback } from './presentation';

export const previewRecoverable: Feedback = { kind: 'error', title: 'Consulta fallida', message: 'Ejemplo de una consulta que puede reintentarse.' };

export const previewFeedback: readonly Feedback[] = [
  { kind: 'loading', title: 'Cargando', message: 'La consulta está en curso.' },
  { kind: 'empty', title: 'Sin resultados', message: 'No hay elementos que mostrar. Revisa los filtros cuando corresponda.' },
  feedbackForError('validation'),
  feedbackForError('unauthenticated'),
  feedbackForError('forbidden'),
  feedbackForError('not-found'),
  feedbackForError('conflict'),
  feedbackForError('unavailable'),
  previewRecoverable,
  feedbackForOutcome({ kind: 'partial', message: 'Ejemplo: el cambio se aplicó, pero no se registró su auditoría.' }),
  feedbackForOutcome({ kind: 'unconfirmed' }),
  feedbackForOutcome({ kind: 'confirmed', message: 'Ejemplo de un resultado confirmado; no se ha ejecutado ninguna operación real.' }),
];

export const previewAgents: readonly AgentOption[] = [
  { id: 'penalista', name: 'Penalista', available: true },
  { id: 'civilista', name: 'Civilista', available: false },
];
