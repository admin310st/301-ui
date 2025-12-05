export type NoticeType = 'success' | 'error' | 'info';

const NOTICE_ROOT_SELECTOR = '#GlobalNotice';
const NOTICE_TEXT_SELECTOR = '#GlobalNoticeText';
const STORAGE_KEY = 'auth_notice';
const AUTOHIDE_DELAY_MS = 8000;

export interface NoticePayload {
  type: NoticeType;
  message: string;
  autoHide?: boolean;
}

function getNoticeElements(): { root: HTMLElement | null; text: HTMLElement | null } {
  const root = document.querySelector<HTMLElement>(NOTICE_ROOT_SELECTOR);
  const text = document.querySelector<HTMLElement>(NOTICE_TEXT_SELECTOR);
  return { root, text };
}

export function showNotice(type: NoticeType, message: string): void {
  const { root, text } = getNoticeElements();
  if (!root || !text) return;

  root.dataset.notice = 'visible';
  root.dataset.type = type;
  text.textContent = message;
}

export function hideNotice(): void {
  const { root, text } = getNoticeElements();
  if (!root || !text) return;

  root.dataset.notice = 'hidden';
  delete root.dataset.type;
  text.textContent = '';
}

export function persistNotice(notice: NoticePayload): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(notice));
}

export function consumePersistedNotice(): NoticePayload | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as NoticePayload;
  } catch (error) {
    console.debug('Failed to parse persisted notice', error);
    return null;
  }
}

function readNoticeFromQuery(params: URLSearchParams): NoticePayload | null {
  const status = params.get('status');
  const message = params.get('msg');
  if (!status && !message) return null;

  let type: NoticeType;
  switch (status) {
    case 'success':
      type = 'success';
      break;
    case 'error':
    case 'fail':
      type = 'error';
      break;
    default:
      type = 'info';
  }

  return {
    type,
    message: message || '',
    autoHide: true,
  };
}

function cleanupQueryParams(params: URLSearchParams): void {
  params.delete('status');
  params.delete('msg');
  const next = params.toString();
  const hash = window.location.hash;
  const path = window.location.pathname;
  const nextUrl = next ? `${path}?${next}${hash}` : `${path}${hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}

export function initNoticeFromSources(): void {
  const params = new URLSearchParams(window.location.search);
  const queryNotice = readNoticeFromQuery(params);
  const storedNotice = consumePersistedNotice();
  const notice = queryNotice || storedNotice;

  if (!notice) return;

  showNotice(notice.type, notice.message);
  if (notice.autoHide !== false) {
    window.setTimeout(() => {
      hideNotice();
    }, AUTOHIDE_DELAY_MS);
  }

  if (queryNotice) cleanupQueryParams(params);
}

export function redirectWithNotice(url: string, notice: NoticePayload): void {
  persistNotice(notice);
  window.location.href = url;
}
