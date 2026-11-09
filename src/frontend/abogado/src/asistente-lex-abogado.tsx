import React from 'react';
import ReactDOMClient from 'react-dom/client';
import singleSpaReact from 'single-spa-react';

import Root from './root.component';
import { StatusNotice } from './ui';
import { feedbackForError } from '../../shared/presentation';

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: Root,
  errorBoundary() {
    console.error('[abogado] No se pudo mostrar la interfaz.');
    return <main id="al-abogado-content" className="al-page" tabIndex={-1}><StatusNotice feedback={feedbackForError('unexpected')} /></main>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
