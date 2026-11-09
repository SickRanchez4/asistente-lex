import { bootstrapApplication, platformBrowser } from '@angular/platform-browser';
import { singleSpaAngular } from 'single-spa-angular';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// Basado en la plantilla oficial de single-spa-angular 22, adaptada a la
// nomenclatura de Angular 22 (clase App en app.ts).
const lifecycles = singleSpaAngular({
  bootstrapFunction: () => bootstrapApplication(App, appConfig, { platformRef: platformBrowser() }),
  NgZone: 'noop',
  template: '<al-root />',
});

export const bootstrap = lifecycles.bootstrap;
export const mount = lifecycles.mount;
export const unmount = lifecycles.unmount;
