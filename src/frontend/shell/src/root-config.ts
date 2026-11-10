import { addErrorHandler, navigateToUrl, registerApplication, start, triggerAppChange, type LifeCycles } from 'single-spa';
import { startAuthentication, type SessionState } from './session';
import { startPublicSettings } from './settings';

let session: SessionState = { status: 'pending' };

declare global {
  interface Window {
    System: { import<T>(id: string): Promise<T> };
  }
}

const loadApplication = (name: string) => () => window.System.import<LifeCycles>(name);
const isApplicationPath = (pathname: string, prefix: string): boolean => pathname === prefix || pathname.startsWith(`${prefix}/`);

registerApplication({
  name: '@asistente-lex/abogado',
  app: loadApplication('@asistente-lex/abogado'),
  activeWhen: (location) => session.status === 'authenticated' && session.role === 'Abogado' && isApplicationPath(location.pathname, '/abogado'),
});

registerApplication({
  name: '@asistente-lex/admin',
  app: loadApplication('@asistente-lex/admin'),
  activeWhen: (location) => session.status === 'authenticated' && session.role === 'Administrador' && isApplicationPath(location.pathname, '/admin'),
});

const home = document.getElementById('al-inicio');
const mountError = document.getElementById('al-mount-error');
const routeError = document.getElementById('al-route-error');
const skipLink = document.getElementById('al-skip-link');
const navigationLinks = document.querySelectorAll<HTMLAnchorElement>('.al-nav a');

function updatePresentation(): void {
  const pathname = window.location.pathname;
  const lawyer = isApplicationPath(pathname, '/abogado');
  const admin = isApplicationPath(pathname, '/admin');
  const authenticated = session.status === 'authenticated';
  const allowed = session.status === 'authenticated' && ((lawyer && session.role === 'Abogado') || (admin && session.role === 'Administrador'));
  if (home) home.hidden = authenticated;
  if (routeError) {
    routeError.hidden = !authenticated || allowed || pathname === '/cuenta' || pathname === '/';
    const title = routeError.querySelector('h2');
    const message = routeError.querySelector('p');
    if (title) title.textContent = lawyer || admin ? 'Acceso no autorizado' : 'Página no disponible';
    if (message) message.textContent = lawyer || admin ? 'No tienes permiso para acceder a esta sección.' : 'La dirección no corresponde a una vista de la plataforma.';
  }
  const account = document.getElementById('al-account');
  if (account) account.hidden = !authenticated || pathname !== '/cuenta';
  if (skipLink) {
    skipLink.setAttribute('href', !authenticated ? '#al-inicio' : pathname === '/cuenta' ? '#al-account'
      : allowed && lawyer ? '#al-abogado-content' : allowed && admin ? '#al-admin-content' : '#al-route-error');
  }
  for (const link of navigationLinks) {
    const active = link.pathname === '/' ? pathname === '/' : pathname === link.pathname || pathname.startsWith(`${link.pathname}/`);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

document.querySelectorAll<HTMLAnchorElement>('[data-al-navigation]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (mountError) mountError.hidden = true;
    navigateToUrl(link.href);
  });
});

window.addEventListener('single-spa:routing-event', () => {
  updatePresentation();
});
addErrorHandler(() => {
  console.error('[shell] La vista no está disponible por un fallo de carga o ciclo de vida.');
  if (mountError) mountError.hidden = false;
  if (skipLink) skipLink.setAttribute('href', '#al-mount-error');
});

updatePresentation();
start();
startPublicSettings();
startAuthentication((next) => {
  session = next;
  if (session.status === 'authenticated' && window.location.pathname === '/') {
    navigateToUrl(session.role === 'Abogado' ? '/abogado' : '/admin');
  }
  updatePresentation();
  void triggerAppChange();
});
