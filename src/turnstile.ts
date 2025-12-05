const DEFAULT_SITE_KEY = '0x4AAAAAACB-_l9VwF1M_QHU';
let turnstileReady: Promise<typeof window.turnstile | null> | null = null;
let siteKey = DEFAULT_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string | void;
      reset: (id?: string | HTMLElement) => void;
    };
    addEventListener(name: 'turnstileLoaded', listener: () => void, options?: unknown): void;
  }
}

function loadScript(): Promise<typeof window.turnstile | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileReady) return turnstileReady;

  turnstileReady = new Promise((resolve) => {
    const existing = document.querySelector('script[data-turnstile]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = 'true';
      document.head.appendChild(script);
    }

    const ready = (): void => {
      resolve(window.turnstile || null);
    };

    window.addEventListener('turnstileLoaded', ready, { once: true });
    setTimeout(ready, 1500);
  });

  return turnstileReady;
}

export async function initTurnstile(root: ParentNode = document): Promise<void> {
  siteKey = await loadSiteKey();
  const api = await loadScript();
  if (!api) return;

  renderTurnstileWidgets(root);
}

async function loadSiteKey(): Promise<string> {
  try {
    const res = await fetch('/env', { cache: 'no-store' });
    if (!res.ok) return DEFAULT_SITE_KEY;
    const data = await res.json();
    return data?.turnstileSitekey || data?.turnstile_sitekey || DEFAULT_SITE_KEY;
  } catch (err) {
    console.debug('turnstile env failed', err);
    return DEFAULT_SITE_KEY;
  }
}

export function renderTurnstileWidgets(root: ParentNode = document): void {
  const api = window.turnstile;
  if (!api || typeof api.render !== 'function') return;
  const containers = root.querySelectorAll<HTMLElement>('.turnstile-widget');
  containers.forEach((container) => {
    if (container.dataset.tsRendered === '1' || container.children.length > 0) return;
    container.dataset.tsRendered = '1';

    const form = container.closest('form');
    const hidden = form?.querySelector<HTMLInputElement>('input[name="turnstile_token"]');
    const btn = form?.querySelector<HTMLButtonElement>('[data-auth-submit]');

    const widgetId = api.render(container, {
      sitekey: siteKey,
      callback(token) {
        if (hidden) hidden.value = token;
        if (btn) btn.disabled = false;
      },
      'expired-callback'() {
        if (hidden) hidden.value = '';
        if (btn) btn.disabled = true;
        try {
          api.reset(widgetId);
        } catch {
          /* noop */
        }
      },
      'error-callback'() {
        if (btn) btn.disabled = true;
      },
    });
  });
}

export function getTurnstileTokenForForm(form: HTMLFormElement): string | null {
  return form.querySelector<HTMLInputElement>('input[name="turnstile_token"]')?.value?.trim() || null;
}

export function resetTurnstile(form?: HTMLFormElement): void {
  const api = window.turnstile;
  if (!api) return;
  if (form) {
    const widget = form.querySelector<HTMLElement>('.turnstile-widget');
    if (widget?.dataset.widgetId) {
      api.reset(widget.dataset.widgetId);
      return;
    }
  }
  try {
    api.reset();
  } catch (err) {
    console.debug('turnstile reset failed', err);
  }
}
