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
      <h1>Administración</h1>
      <section>
        <h2>Cuenta de administración</h2>
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
