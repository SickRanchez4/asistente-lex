import type { SessionPresentation } from '../../shared/navigation';

export type SessionState = SessionPresentation;
interface User { userId: string; accountId: string; name: string; role: 'ABOGADO' | 'ADMINISTRADOR' }
interface Outcome { success: boolean; user: User | null; category: string | null; message: string | null; auditRecorded: boolean }
const fields = 'success category message auditRecorded user { userId accountId name role }';

async function graphql(operation: string, variables: Record<string, string> = {}): Promise<Outcome> {
  const response = await fetch('/graphql', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json', 'x-lex-request': '1' }, body: JSON.stringify({ query: operation, variables }),
    signal: AbortSignal.timeout(12_000) });
  const body = await response.json();
  if (!response.ok || body.errors?.length || !body.data) throw new Error('No se pudo confirmar la operación. Comprueba el estado antes de repetirla.');
  return Object.values(body.data)[0] as Outcome;
}

export function startAuthentication(onChange: (session: SessionState) => void): void {
  const login = document.getElementById('al-login-form') as HTMLFormElement;
  const password = document.getElementById('al-password-form') as HTMLFormElement;
  const pending = document.getElementById('al-session-pending')!;
  const nav = document.getElementById('al-session-nav')!;
  const workspace = document.getElementById('al-workspace') as HTMLAnchorElement;
  const logout = document.getElementById('al-logout') as HTMLButtonElement;
  const retry = document.getElementById('al-session-retry') as HTMLButtonElement;
  const message = document.getElementById('al-auth-message')!;
  const accountMenu = document.getElementById('al-account-menu') as HTMLDetailsElement;
  const accountName = document.getElementById('al-account-name')!;
  const accountMonogram = document.getElementById('al-account-monogram')!;
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('lex-session');
  let state: SessionState = { status: 'pending' };
  let revision = 0;
  let operationRevision = 0;
  let busy = false;
  let checking = false;
  let lastActivity = Date.now();

  function notice(text: string | null): void {
    message.textContent = text ?? '';
    message.hidden = !text;
  }

  function setState(next: SessionState): void {
    const changed = next.status !== state.status || (next.status === 'authenticated' && state.status === 'authenticated' && next.accountId !== state.accountId);
    state = next;
    nav.hidden = next.status !== 'authenticated';
    pending.hidden = next.status !== 'pending';
    login.hidden = next.status !== 'anonymous';
    if (next.status === 'authenticated') {
      workspace.href = next.role === 'Abogado' ? '/abogado' : '/admin';
      workspace.textContent = next.role === 'Abogado' ? 'Mi espacio' : 'Administración';
    }
    if (changed) {
      accountMenu.open = false;
      if (next.status !== 'authenticated') { accountName.textContent = ''; accountMonogram.textContent = ''; }
      password.reset();
      window.dispatchEvent(new CustomEvent('al-session-changed', { detail: next }));
    }
    onChange(next);
  }

  function accept(result: Outcome): void {
    if (result.success && result.user) {
      setState({ status: 'authenticated', role: result.user.role === 'ABOGADO' ? 'Abogado' : 'Administrador', accountId: result.user.accountId });
      accountName.textContent = result.user.name;
      accountMonogram.textContent = result.user.name.trim().slice(0, 1).toLocaleUpperCase('es');
    } else {
      setState({ status: 'anonymous' });
    }
    if (result.message && (result.category !== 'UNAUTHENTICATED' || !result.auditRecorded)) notice(result.message);
  }

  async function refresh(): Promise<void> {
    if (checking || busy) return;
    checking = true;
    const current = revision;
    try {
      const result = await graphql(`{ session { ${fields} } }`);
      if (current === revision) { retry.hidden = true; accept(result); }
    } catch {
      if (current === revision) {
        setState({ status: 'pending' });
        pending.textContent = 'No se pudo verificar la sesión.';
        retry.hidden = false;
        notice('El servicio de acceso no está disponible.');
      }
    } finally { checking = false; }
  }

  async function submit(form: HTMLFormElement | null, operation: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true;
    operationRevision = ++revision;
    notice(null);
    const buttons = form ? [...form.querySelectorAll<HTMLButtonElement>('button')] : [logout];
    buttons.forEach((button) => { button.disabled = true; });
    form?.setAttribute('aria-busy', 'true');
    try { await operation(); }
    catch {
      setState({ status: 'pending' });
      pending.textContent = 'Resultado pendiente de confirmar.';
      retry.hidden = false;
      notice('No se pudo confirmar el resultado. Comprueba la sesión antes de repetir la operación.');
    }
    finally {
      busy = false;
      buttons.forEach((button) => { button.disabled = false; });
      form?.removeAttribute('aria-busy');
      if (operationRevision !== revision) void refresh();
    }
  }

  login.addEventListener('submit', (event) => {
    event.preventDefault();
    void submit(login, async () => {
      const values = new FormData(login);
      const result = await graphql(`mutation Login($email:String!,$password:String!){ login(email:$email,password:$password){ ${fields} } }`,
        { email: String(values.get('email')), password: String(values.get('password')) });
      if (operationRevision !== revision) return;
      if (result.success && result.user) {
        window.history.replaceState(null, '', result.user.role === 'ABOGADO' ? '/abogado' : '/admin');
        login.reset(); lastActivity = Date.now(); channel?.postMessage('changed');
      }
      accept(result);
      if (!result.success) notice(result.message);
    });
  });

  logout.addEventListener('click', () => void submit(null, async () => {
    const result = await graphql(`mutation { logout { ${fields} } }`);
    if (operationRevision !== revision) return;
    if (result.success || result.category === 'UNAUTHENTICATED') {
      window.history.replaceState(null, '', '/');
      setState({ status: 'anonymous' }); login.reset(); password.reset();
      channel?.postMessage('changed');
    }
    notice(result.message);
  }));

  password.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(password);
    const nextPassword = String(values.get('newPassword'));
    if (nextPassword !== values.get('confirmPassword')) { notice('Las contraseñas nuevas no coinciden.'); return; }
    if (new TextEncoder().encode(nextPassword).length > 72) { notice('La contraseña supera los 72 bytes permitidos.'); return; }
    void submit(password, async () => {
      const result = await graphql(`mutation Password($currentPassword:String!,$newPassword:String!){ changePassword(currentPassword:$currentPassword,newPassword:$newPassword){ ${fields} } }`,
        { currentPassword: String(values.get('currentPassword')), newPassword: nextPassword });
      if (operationRevision !== revision) return;
      if (result.category === 'UNAUTHENTICATED') accept(result);
      if (result.success) {
        password.reset();
        window.dispatchEvent(new CustomEvent('al-password-changed'));
      }
      notice(result.message ?? (result.success ? 'Contraseña actualizada.' : 'No se pudo cambiar la contraseña.'));
    });
  });

  async function activity(event: Event): Promise<void> {
    if (!event.isTrusted || busy || checking || state.status !== 'authenticated' || Date.now() - lastActivity < 60_000) return;
    lastActivity = Date.now();
    const current = revision;
    try {
      const result = await graphql(`mutation { sessionActivity { ${fields} } }`);
      if (current === revision) accept(result);
    } catch {
      if (current === revision) {
        setState({ status: 'pending' });
        pending.textContent = 'No se pudo verificar la sesión.';
        retry.hidden = false;
      }
    }
  }

  accountMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && accountMenu.open) { accountMenu.open = false; accountMenu.querySelector('summary')?.focus(); }
  });
  accountMenu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a, button')) accountMenu.open = false;
  });
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !accountMenu.contains(event.target)) accountMenu.open = false;
  });
  retry.addEventListener('click', () => { notice(null); void refresh(); });
  channel?.addEventListener('message', () => { revision++; setState({ status: 'pending' }); void refresh(); });
  window.addEventListener('pointerdown', (event) => void activity(event));
  window.addEventListener('keydown', (event) => void activity(event));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  window.setInterval(() => { if (!document.hidden) void refresh(); }, 60_000);
  void refresh();
}