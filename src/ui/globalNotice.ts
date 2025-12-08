import { t } from '@i18n';

export type NoticeType = 'success' | 'error' | 'info';

let hideTimer: number | null = null;

function getRoot(): HTMLElement | null {
  return document.getElementById('GlobalNotice');
}

function getTextNode(): HTMLElement | null {
  return document.getElementById('GlobalNoticeText') as HTMLElement | null;
}

export interface ShowNoticeOptions {
  autoHideMs?: number; // default 6000
}

export function showGlobalNotice(
  type: NoticeType,
  message: string,
  opts: ShowNoticeOptions = {}
): void {
  const root = getRoot();
  const textNode = getTextNode();
  if (!root || !textNode) return;

  const autoHideMs = opts.autoHideMs ?? 6000;

  // clear previous timer
  if (hideTimer != null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }

  root.dataset.type = type;
  root.setAttribute('role', type === 'error' ? 'alert' : 'status');
  root.setAttribute('aria-live', 'polite');
  textNode.textContent = message;
  root.dataset.state = 'visible';

  if (autoHideMs > 0) {
    hideTimer = window.setTimeout(() => {
      hideGlobalNotice();
    }, autoHideMs);
  }
}

export function hideGlobalNotice(): void {
  const root = getRoot();
  if (!root) return;

  root.dataset.state = 'hidden';

  if (hideTimer != null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export function initGlobalNotice(): void {
  const root = getRoot();
  if (!root) return;

  const closeBtn = root.querySelector<HTMLButtonElement>('.global-notice__close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => hideGlobalNotice());
  }

  // 1) Query: ?status=success&msg=...
  const url = new URL(window.location.href);
  const status = url.searchParams.get('status');
  const msg = url.searchParams.get('msg');

  if (status && msg) {
    const type: NoticeType =
      status === 'success' || status === 'error' || status === 'info'
        ? (status as NoticeType)
        : 'info';

    showGlobalNotice(type, decodeURIComponent(msg));

    url.searchParams.delete('status');
    url.searchParams.delete('msg');
    window.history.replaceState({}, '', url.toString());
  }

  // 2) sessionStorage: перенос уведомлений между страницами
  try {
    const stored = window.sessionStorage.getItem('globalNotice');
    if (stored) {
      const parsed = JSON.parse(stored) as { type: NoticeType; message: string };
      showGlobalNotice(parsed.type, parsed.message);
      window.sessionStorage.removeItem('globalNotice');
    }
  } catch {
    // ignore
  }
}

// helper для сценариев с редиректом (reset и т.п.)
export function setNextPageNotice(type: NoticeType, messageKey: string): void {
  try {
    const payload = {
      type,
      message: t(messageKey),
    };
    window.sessionStorage.setItem('globalNotice', JSON.stringify(payload));
  } catch {
    // ignore
  }
}
