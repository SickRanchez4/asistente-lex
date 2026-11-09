export type Role = 'Abogado' | 'Administrador';
export type SessionPresentation =
  | { readonly status: 'pending' }
  | { readonly status: 'anonymous' }
  | { readonly status: 'authenticated'; readonly role: Role; readonly accountId: string };

export interface NavigationItem {
  readonly key: string;
  readonly role: Role;
  readonly label: string;
  readonly href: string;
}

function applicationPath(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) throw new Error('Se requiere un destino relativo de la aplicación.');
  const url = new URL(href, 'https://asistente-lex.invalid');
  if (url.origin !== 'https://asistente-lex.invalid') throw new Error('Destino externo de navegación no permitido.');
  return url.pathname;
}

export function navigationForSession(session: SessionPresentation, items: readonly NavigationItem[]): readonly NavigationItem[] {
  switch (session.status) {
    case 'pending':
    case 'anonymous': return [];
    case 'authenticated': {
      if (session.role !== 'Abogado' && session.role !== 'Administrador') throw new Error('Rol de presentación no reconocido.');
      const prefix = session.role === 'Abogado' ? '/abogado' : '/admin';
      const visible = items.filter((item) => item.role === session.role);
      for (const item of visible) {
        const pathname = applicationPath(item.href);
        if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
          throw new Error('Destino de navegación fuera del ámbito del rol.');
        }
      }
      return visible;
    }
    default: throw new Error('Estado de sesión de presentación no reconocido.');
  }
}

export function isNavigationActive(href: string, currentPath: string): boolean {
  const path = applicationPath(href);
  const current = applicationPath(currentPath);
  if (path === '/abogado' || path === '/admin') return current === path;
  return current === path || current.startsWith(`${path}/`);
}
