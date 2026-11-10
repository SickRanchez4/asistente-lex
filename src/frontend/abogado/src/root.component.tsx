import UiPreview from './ui-preview';
import AgentCatalog from './agents';
import People from './people';
import Cases from './cases';
import { useEffect, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, LayoutDashboard, UsersRound } from 'lucide-react';
import { OfflineIndicator, useOnline } from './ui';
declare const __AL_UI_PREVIEW__: boolean;

export default function Root() {
  const [path, setPath] = useState(window.location.pathname);
  const online = useOnline();
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('single-spa:routing-event', update);
    window.addEventListener('popstate', update);
    return () => { window.removeEventListener('single-spa:routing-event', update); window.removeEventListener('popstate', update); };
  }, []);
  const people = path.startsWith('/abogado/personas');
  const cases = path.startsWith('/abogado/expedientes');
  return (
    <main id="al-abogado-content" className="al-page al-workspace-layout" tabIndex={-1} onClick={event => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const link = event.target.closest('a');
      if (!(link instanceof HTMLAnchorElement) || link.origin !== location.origin || link.download || (link.target && link.target !== '_self') || !(link.pathname === '/abogado' || link.pathname.startsWith('/abogado/'))) return;
      event.preventDefault(); window.history.pushState(null, '', link.href);
    }}>
      <aside className="al-workspace-sidebar">
        <span className="al-workspace-role">Abogado</span>
        <nav className="al-nav al-workspace-nav" aria-label="Secciones del abogado">
          <a href="/abogado" aria-current={!people && !cases ? 'page' : undefined}><LayoutDashboard className="al-icon" aria-hidden="true" />Mi espacio</a>
          <a href="/abogado/expedientes" aria-current={cases ? 'page' : undefined}><BriefcaseBusiness className="al-icon" aria-hidden="true" />Expedientes</a>
          <a href="/abogado/personas" aria-current={people ? 'page' : undefined}><UsersRound className="al-icon" aria-hidden="true" />Personas</a>
        </nav>
      </aside>
      <div className="al-workspace-body">
        <div className="al-offline-bar"><OfflineIndicator connectivity={online ? 'online' : 'offline'} /></div>
        {cases ? <Cases /> : people ? <People /> : <>
          <div className="al-page-heading"><h1>Mi espacio</h1></div>
          <div className="al-workspace-links">
            <a className="al-workspace-link" href="/abogado/expedientes"><BriefcaseBusiness className="al-icon" aria-hidden="true" /><div><strong>Expedientes</strong><span>Asuntos, actuaciones, documentos e informes</span></div><ArrowUpRight className="al-icon" aria-hidden="true" /></a>
            <a className="al-workspace-link" href="/abogado/personas"><UsersRound className="al-icon" aria-hidden="true" /><div><strong>Personas</strong><span>Personas naturales y jurídicas de tu cuenta</span></div><ArrowUpRight className="al-icon" aria-hidden="true" /></a>
          </div>
          <AgentCatalog />{__AL_UI_PREVIEW__ && <UiPreview />}
        </>}
      </div>
    </main>
  );
}
