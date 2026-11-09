import { ErrorHandler, Injectable, signal } from '@angular/core';
import { feedbackForError, type Feedback } from '../../../shared/presentation';

@Injectable({ providedIn: 'root' })
export class UiErrorHandler implements ErrorHandler {
  readonly feedback = signal<Feedback | null>(null);
  handleError(): void {
    console.error('[admin] No se pudo completar una operación de interfaz.');
    this.feedback.set(feedbackForError('unexpected'));
  }
}
