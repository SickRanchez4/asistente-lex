import { addErrorHandler, navigateToUrl, registerApplication, start, type LifeCycles } from 'single-spa';

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
  activeWhen: (location) => isApplicationPath(location.pathname, '/abogado'),
});

registerApplication({
  name: '@asistente-lex/admin',
  app: loadApplication('@asistente-lex/admin'),
  activeWhen: (location) => isApplicationPath(location.pathname, '/admin'),
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
  if (home) home.hidden = pathname !== '/';
  if (routeError) routeError.hidden = pathname === '/' || lawyer || admin;
  if (skipLink) {
    skipLink.setAttribute('href', lawyer ? '#al-abogado-content'
      : admin ? '#al-admin-content' : pathname === '/' ? '#al-inicio' : '#al-route-error');
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
