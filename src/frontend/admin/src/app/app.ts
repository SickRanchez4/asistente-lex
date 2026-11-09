import { Component, inject, isDevMode } from '@angular/core';
import { UiPreview } from './ui-preview';
import { StatusNotice } from './ui.components';
import { UiErrorHandler } from './ui-error-handler';

@Component({
  selector: 'al-root',
  imports: [UiPreview, StatusNotice],
  template: `
    <main id="al-admin-content" class="al-page" tabindex="-1">
      <p class="al-eyebrow">Administración</p>
      <h1>Una base clara para administrar la aplicación</h1>
      <section class="al-card">
        <h2>Base de la interfaz Angular</h2>
        <p>Los estados, formularios y formatos compartidos están preparados para cuentas, parámetros y agentes.</p>
        <p class="al-muted">Vista técnica sin autenticación. La navegación administrativa se conectará cuando estén disponibles la sesión y sus pantallas reales.</p>
      </section>
      @if (errors.feedback(); as feedback) { <al-status-notice [feedback]="feedback" /> }
      @if (preview) { <al-ui-preview /> }
    </main>
  `,
})
export class App {
  readonly errors = inject(UiErrorHandler);
  readonly preview = isDevMode();
}
