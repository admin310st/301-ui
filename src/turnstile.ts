import { t } from '@i18n';
import { setFormState } from '@ui/dom';
import { logDebug } from '@utils/logger';

export function getTurnstileRequiredMessage(): string {
  return t('auth.messages.turnstileRequired');
}

const DEFAULT_SITE_KEY = '0x4AAAAAACB-_l9VwF1M_QHU';
const formTokens = new WeakMap<HTMLFormElement, string | null>();
let siteKey = DEFAULT_SITE_KEY;
let observer: MutationObserver | null = null;
let globalToken: string | null = null;
let globalTokenIssuedAt = 0;
const GLOBAL_TOKEN_TTL_MS = 2 * 60 * 1000;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string | void;
      reset: (id?: string | HTMLElement) => void;
    };
    addEventListener(name: 'turnstileLoaded', listener: () => void, options?: unknown): void;
  }
}

async function loadSiteKey(): Promise<string> {
  try {
    const res = await fetch('/env', { cache: 'no-store' });
    if (!res.ok) return DEFAULT_SITE_KEY;
    const data = (await res.json()) as { turnstileSitekey?: string; turnstile_sitekey?: string };
    return data.turnstileSitekey || data.turnstile_sitekey || DEFAULT_SITE_KEY;
  } catch (error) {
    logDebug('Failed to load Turnstile sitekey', error as Error);
    return DEFAULT_SITE_KEY;
  }
}

function loadScript(): Promise<typeof window.turnstile | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-turnstile]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = 'true';
      document.head.appendChild(script);
    }

    const ready = (): void => resolve(window.turnstile || null);
    window.addEventListener('turnstileLoaded', ready, { once: true });
    setTimeout(ready, 2000);
  });
}

function bindObserver(root: ParentNode): void {
  if (!(root instanceof Document)) return;
  observer?.disconnect();
  observer = new MutationObserver(() => renderTurnstileWidgets(root));
  observer.observe(root, { childList: true, subtree: true });
}

export async function initTurnstile(root: ParentNode = document): Promise<void> {
  siteKey = await loadSiteKey();
  const api = await loadScript();
  if (!api) return;
  renderTurnstileWidgets(root);
  bindObserver(root);
}

function storeToken(form: HTMLFormElement | null, token: string | null): void {
  if (form) {
    formTokens.set(form, token);
    const hidden = form.querySelector<HTMLInputElement>('input[name="turnstile_token"]');
    if (hidden) hidden.value = token ?? '';
    return;
  }

  globalToken = token;
  globalTokenIssuedAt = token ? Date.now() : 0;
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 1024;
}

export function renderTurnstileWidgets(root: ParentNode = document): void {
  const api = window.turnstile;
  if (!api || typeof api.render !== 'function') return;

  root.querySelectorAll<HTMLElement>('.turnstile-widget').forEach((container) => {
    if (container.dataset.tsRendered === '1') return;
    container.dataset.tsRendered = '1';

    const form = container.closest('form');
    const statusContainer = container.closest('[data-turnstile-status]');
    const mobile = isMobile();

    // Show container before rendering so widget can calculate dimensions
    if (statusContainer) {
      statusContainer.hidden = false;
    }

    const widgetId = api.render(container, {
      sitekey: siteKey,
      theme: 'auto',
      size: 'flexible',
      appearance: mobile ? 'always' : 'execute',
      callback: (token: string) => {
        storeToken(form, token);
        const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submit) {
          submit.disabled = false;
          submit.removeAttribute('data-turnstile-pending');
        }
        // Hide widget after successful completion (desktop only, prevent layout shift on mobile)
        if (statusContainer && !mobile) {
          setTimeout(() => {
            statusContainer.hidden = true;
          }, 500);
        }
      },
      'expired-callback': () => {
        storeToken(form, null);
        // Show widget when token expires
        if (statusContainer) statusContainer.hidden = false;
      },
      'error-callback': () => {
        storeToken(form, null);
        const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submit) submit.disabled = true;
        // Keep widget visible on error
        if (statusContainer) statusContainer.hidden = false;
      },
    });

    if (typeof widgetId === 'string') {
      container.dataset.widgetId = widgetId;
    }
  });

  root
    .querySelectorAll<HTMLFormElement>(
      'form[data-form="login"], form[data-form="register"], form[data-form="reset-request"], form[data-form="reset-confirm"], form[data-form="cf-bootstrap"]'
    )
    .forEach((form) => {
      if (!form.querySelector('input[name="turnstile_token"]')) {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'turnstile_token';
        form.appendChild(hidden);
      }

      // Disable submit button until Turnstile validation completes
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (submit && !submit.dataset.turnstileInit) {
        submit.disabled = true;
        submit.dataset.turnstileInit = '1';
        submit.dataset.turnstilePending = 'true';
      }
    });
}

export function getTurnstileToken(form?: HTMLFormElement): string | null {
  if (form && formTokens.has(form)) {
    return formTokens.get(form) ?? null;
  }

  const isGlobalFresh = Boolean(globalToken && Date.now() - globalTokenIssuedAt < GLOBAL_TOKEN_TTL_MS);
  if (isGlobalFresh) return globalToken;

  if (form) {
    return form.querySelector<HTMLInputElement>('input[name="turnstile_token"]')?.value || null;
  }

  return null;
}

export function requireTurnstileToken(form: HTMLFormElement): string | null {
  const token = getTurnstileToken(form);
  if (token) return token;

  setFormState(form, 'error', getTurnstileRequiredMessage());

  const widget = form.querySelector<HTMLElement>('.turnstile-widget');
  const iframe = widget?.querySelector<HTMLIFrameElement>('iframe');
  (iframe || widget)?.focus?.();

  return null;
}

export function resetTurnstile(form?: HTMLFormElement): void {
  const api = window.turnstile;
  if (!api || typeof api.reset !== 'function') return;

  globalToken = null;
  globalTokenIssuedAt = 0;

  if (form) {
    const widget = form.querySelector<HTMLElement>('.turnstile-widget');
    if (widget?.dataset.widgetId) {
      api.reset(widget.dataset.widgetId);
      storeToken(form, null);
      return;
    }
  }

  try {
    api.reset();
  } catch (error) {
    logDebug('Turnstile reset failed', error as Error);
  }
}
