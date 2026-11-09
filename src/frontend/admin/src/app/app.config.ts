import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { UiErrorHandler } from './ui-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), { provide: ErrorHandler, useExisting: UiErrorHandler }],
};
