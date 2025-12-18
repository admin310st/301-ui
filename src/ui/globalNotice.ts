import { t } from '@i18n';

export type NoticeType = 'success' | 'error' | 'info';

const ICON_BY_TYPE: Record<NoticeType, string> = {
  success: '#i-mono-success',
  error: '#i-mono-alert',
  info: '#i-mono-info',
};

const TYPE_CLASSNAME: Record<NoticeType, string> = {
  success: 'app-alert--success',
  error: 'app-alert--error',
  info: 'app-alert--info',
};

let hideTimer: number | null = null;

function getRoot(): HTMLElement | null {
  return document.getElementById('GlobalNotice');
}

function getTextNode(): HTMLElement | null {
  return document.getElementById('GlobalNoticeText') as HTMLElement | null;
}

function getIconUse(): SVGUseElement | null {
  return document.querySelector('#GlobalNotice .app-alert__icon use');
}

function applyType(root: HTMLElement, type: NoticeType): void {
  root.dataset.type = type;
  Object.values(TYPE_CLASSNAME).forEach((className) => root.classList.remove(className));
  root.classList.add(TYPE_CLASSNAME[type]);
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
  const iconUse = getIconUse();
  if (!root || !textNode) return;

  const autoHideMs = opts.autoHideMs ?? 6000;

  // clear previous timer
  if (hideTimer != null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }

  applyType(root, type);
  root.setAttribute('role', type === 'error' ? 'alert' : 'status');
  root.setAttribute('aria-live', 'polite');
  if (iconUse) {
    iconUse.setAttribute('href', ICON_BY_TYPE[type]);
  }
  textNode.textContent = message;

  root.dataset.state = 'visible';
  root.dataset.notice = 'visible';

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
  root.dataset.notice = 'hidden';

  if (hideTimer != null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export function initGlobalNotice(): void {
  const root = getRoot();
  if (!root) return;

  const closeBtn = root.querySelector<HTMLButtonElement>('.app-alert__close');
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
