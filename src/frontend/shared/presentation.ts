export type ErrorCategory =
  | 'validation' | 'unauthenticated' | 'forbidden' | 'not-found'
  | 'conflict' | 'unavailable' | 'partial' | 'unexpected';

export interface Feedback {
  readonly kind: 'loading' | 'empty' | 'error' | 'forbidden' | 'not-found' | 'unavailable' | 'partial' | 'success' | 'unconfirmed';
  readonly title: string;
  readonly message: string;
}

const errors: Record<ErrorCategory, Feedback> = {
  validation: { kind: 'error', title: 'Revisa los datos', message: 'Corrige los campos indicados y vuelve a enviar el formulario.' },
  unauthenticated: { kind: 'forbidden', title: 'Sesión no disponible', message: 'Inicia sesión para continuar.' },
  forbidden: { kind: 'forbidden', title: 'Acceso no autorizado', message: 'No tienes permiso para realizar esta acción.' },
  'not-found': { kind: 'not-found', title: 'Recurso no disponible', message: 'Vuelve al listado para continuar.' },
  conflict: { kind: 'error', title: 'La acción no está disponible', message: 'Revisa el estado actual del recurso antes de continuar.' },
  unavailable: { kind: 'unavailable', title: 'Servicio no disponible', message: 'No se pudo completar la operación. No se ha confirmado su resultado.' },
  partial: { kind: 'partial', title: 'Operación incompleta', message: 'Solo se completó una parte. Revisa el resultado antes de continuar.' },
  unexpected: { kind: 'error', title: 'No se pudo completar la operación', message: 'Se produjo un error. Revisa el estado antes de intentarlo nuevamente.' },
};

export function feedbackForError(category: ErrorCategory): Feedback {
  if (!Object.hasOwn(errors, category)) {
    console.error('[UI] Categoría de error no reconocida.');
    return errors.unexpected;
  }
  return errors[category];
}

export type OperationOutcome =
  | { readonly kind: 'confirmed'; readonly message: string }
  | { readonly kind: 'partial'; readonly message: string }
  | { readonly kind: 'failed'; readonly category: ErrorCategory }
  | { readonly kind: 'unconfirmed' };

export function feedbackForOutcome(outcome: OperationOutcome): Feedback {
  switch (outcome.kind) {
    case 'confirmed': return { kind: 'success', title: 'Operación confirmada', message: outcome.message };
    case 'partial': return { kind: 'partial', title: 'Operación incompleta', message: outcome.message };
    case 'failed': return feedbackForError(outcome.category);
    case 'unconfirmed': return { kind: 'unconfirmed', title: 'Resultado no confirmado', message: 'Comprueba el estado antes de repetir la operación; podría haberse aplicado.' };
    default: throw new Error('Resultado de presentación no reconocido.');
  }
}

export function feedbackRole(feedback: Feedback): 'status' | 'alert' {
  return ['loading', 'empty', 'success'].includes(feedback.kind) ? 'status' : 'alert';
}

export function feedbackAllowsRetry(feedback: Feedback): boolean {
  return feedback.kind === 'error' || feedback.kind === 'unavailable';
}

export type CaseState = 'Abierto' | 'Cerrado' | 'Archivado';
export type Connectivity = 'online' | 'offline' | 'unknown';
export interface AgentOption {
  readonly id: string;
  readonly name: string;
  readonly available: boolean;
}

export function readOnlyMessage(state: CaseState): string | null {
  switch (state) {
    case 'Abierto': return null;
    case 'Cerrado': return 'Expediente Cerrado: contenido jurídico de solo lectura.';
    case 'Archivado': return 'Expediente Archivado: contenido jurídico de solo lectura.';
    default: throw new Error('Estado del expediente no reconocido.');
  }
}
