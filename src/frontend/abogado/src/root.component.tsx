import UiPreview from './ui-preview';
import AgentCatalog from './agents';
import People from './people';
import { useEffect, useState } from 'react';
declare const __AL_UI_PREVIEW__: boolean;

export default function Root() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('single-spa:routing-event', update);
    window.addEventListener('popstate', update);
    return () => { window.removeEventListener('single-spa:routing-event', update); window.removeEventListener('popstate', update); };
  }, []);
  const people = path.startsWith('/abogado/personas');
  return (
    <main id="al-abogado-content" className="al-page" tabIndex={-1}>
      <p className="al-eyebrow">Espacio del Abogado</p>
      <nav className="al-nav al-admin-tabs" aria-label="Secciones del abogado">
        <a href="/abogado" aria-current={!people ? 'page' : undefined}>Mi espacio</a>
        <a href="/abogado/personas" aria-current={people ? 'page' : undefined}>Personas</a>
      </nav>
      {people ? <People /> : <><h1>Mi espacio</h1><AgentCatalog />{__AL_UI_PREVIEW__ && <UiPreview />}</>}
    </main>
  );
}
