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
let scrollListenerAttached = false;

function getRoot(): HTMLElement | null {
  return document.getElementById('GlobalNotice');
}

/**
 * Calculate the Y position of utility-bar in viewport
 * For position:fixed elements, we need viewport coordinates
 */
function calculateUtilityBarPosition(): number {
  const utilityBar = document.querySelector<HTMLElement>('.utility-bar');
  if (!utilityBar) {
    // Fallback: calculate based on header height
    const header = document.querySelector<HTMLElement>('.site-header');
    if (header) {
      const headerRect = header.getBoundingClientRect();
      return Math.max(0, headerRect.bottom);
    }
    return 160; // Approximate fallback
  }

  // Get position in viewport (for position:fixed)
  const rect = utilityBar.getBoundingClientRect();
  return Math.max(0, rect.top);
}

/**
 * Check if utility-bar is visible in viewport
 * We consider it visible if it hasn't scrolled past the top of the viewport
 */
function isUtilityBarVisible(): boolean {
  const utilityBar = document.querySelector('.utility-bar');
  if (!utilityBar) return false;

  const rect = utilityBar.getBoundingClientRect();
  // Visible if top edge is still in viewport (not scrolled past top)
  // Allow small negative values for smooth transition
  return rect.top >= -10;
}

/**
 * Update alert CSS top position to match utility-bar
 */
function updateAlertTop(root: HTMLElement): void {
  const utilityBarTop = calculateUtilityBarPosition();
  root.style.top = `${utilityBarTop}px`;
}

/**
 * Update alert position based on utility-bar visibility
 * - If utility-bar is visible: overlay it (match its position)
 * - If utility-bar is not visible: slide down from top
 */
function updateAlertPosition(root: HTMLElement): void {
  const isVisible = isUtilityBarVisible();

  if (isVisible) {
    // utility-bar visible - show alert overlaying it
    updateAlertTop(root);
    root.removeAttribute('data-position');
  } else {
    // utility-bar not visible - slide down from top of viewport
    root.style.top = '0';
    root.dataset.position = 'top';
  }
}

/**
 * Global scroll handler to update alert position dynamically
 */
function handleScroll(): void {
  const root = getRoot();
  if (!root || root.dataset.state !== 'visible') return;

  updateAlertPosition(root);
}

/**
 * Attach scroll listener if not already attached
 */
function ensureScrollListener(): void {
  if (scrollListenerAttached) return;

  window.addEventListener('scroll', handleScroll, { passive: true });
  scrollListenerAttached = true;
}

/**
 * Remove scroll listener
 */
function removeScrollListener(): void {
  if (!scrollListenerAttached) return;

  window.removeEventListener('scroll', handleScroll);
  scrollListenerAttached = false;
}

/**
 * Handle window resize - update alert position
 */
function handleResize(): void {
  const root = getRoot();
  if (!root || root.dataset.state !== 'visible') return;

  updateAlertPosition(root);
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

  // Update position based on utility-bar visibility BEFORE showing
  updateAlertPosition(root);

  root.dataset.state = 'visible';
  root.dataset.notice = 'visible';

  // Enable scroll listener to update position dynamically
  ensureScrollListener();

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

  // Add resize listener to update alert position
  window.addEventListener('resize', handleResize, { passive: true });

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
