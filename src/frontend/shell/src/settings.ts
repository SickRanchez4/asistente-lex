import { requestGraphql } from '../../shared/graphql';

export function startPublicSettings(): void {
  const container = document.getElementById('al-public-settings')!;
  const notice = document.getElementById('al-global-message')!;
  const support = document.getElementById('al-support-contact') as HTMLAnchorElement;
  const error = document.getElementById('al-public-settings-error')!;
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('lex-settings');
  let version = 0;
  async function refresh(): Promise<void> {
    const current = ++version;
    try {
      const { applicationSettings: settings } = await requestGraphql<{ applicationSettings: { globalMessage: string; supportEmail: string } }>('{applicationSettings{globalMessage supportEmail}}');
      if (current !== version) return;
      container.hidden = !settings.globalMessage && !settings.supportEmail;
      notice.textContent = settings.globalMessage;
      notice.hidden = !settings.globalMessage;
      support.textContent = settings.supportEmail ? `Ayuda: ${settings.supportEmail}` : '';
      support.href = settings.supportEmail ? `mailto:${encodeURIComponent(settings.supportEmail)}` : '';
      support.hidden = !settings.supportEmail;
      error.hidden = true;
    } catch {
      if (current !== version) return;
      container.hidden = false; notice.hidden = true; support.hidden = true; error.hidden = false;
    }
  }
  window.addEventListener('al-settings-changed', () => { channel?.postMessage('changed'); void refresh(); });
  channel?.addEventListener('message', () => void refresh());
  window.addEventListener('focus', () => void refresh());
  window.setInterval(() => { if (!document.hidden) void refresh(); }, 60_000);
  void refresh();
}