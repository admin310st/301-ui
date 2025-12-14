const AUTH_VIEWS = ['login', 'register', 'reset', 'verify'] as const;
export type AuthView = (typeof AUTH_VIEWS)[number];

export type ResetMode = 'request' | 'confirm';

function getViewFromHash(hash: string): AuthView {
  const normalized = hash.replace('#', '') as AuthView;
  return (AUTH_VIEWS as readonly string[]).includes(normalized) ? normalized : 'login';
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 1024;
}

let scrollRequest: AuthView | null = null;

export function requestAuthScroll(view: AuthView): void {
  scrollRequest = view;
}

export function showAuthView(view: AuthView): void {
  let activeView: HTMLElement | null = null;

  document.querySelectorAll<HTMLElement>('[data-auth-view]').forEach((el) => {
    const isActive = el.dataset.authView === view;
    el.hidden = !isActive;
    el.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    if (isActive) {
      activeView = el;
    }
  });

  document.querySelectorAll<HTMLElement>('[data-auth-tab]').forEach((tab) => {
    const isActive = tab.dataset.authTab === view;
    tab.classList.toggle('is-active', isActive);
    tab.toggleAttribute('aria-current', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });

  const shouldScroll = isMobile() && activeView && scrollRequest === view;

  // Scroll to active view on mobile/tablet after explicit request
  if (shouldScroll) {
    // Small delay to allow tab switch animation to start
    setTimeout(() => {
      if (!activeView) return;

      const scrollTarget = activeView.querySelector<HTMLElement>('form') ?? activeView;

      // Calculate position accounting for sticky header
      const header = document.querySelector('.site-header');
      const headerHeight = header?.getBoundingClientRect().height || 96;
      const elementTop = scrollTarget.getBoundingClientRect().top + window.scrollY;
      const offset = headerHeight + 8; // header + small gap

      window.scrollTo({
        top: Math.max(elementTop - offset, 0),
        behavior: 'smooth',
      });

      scrollRequest = null;
    }, 100);
  } else {
    scrollRequest = null;
  }
}

export function setResetMode(mode: ResetMode): void {
  const root = document.querySelector<HTMLElement>('[data-auth-view="reset"]');
  if (!root) return;

  const request = root.querySelector<HTMLElement>('[data-reset-mode="request"]');
  const confirm = root.querySelector<HTMLElement>('[data-reset-mode="confirm"]');

  const isRequest = mode === 'request';

  if (request) {
    request.toggleAttribute('hidden', !isRequest);
  }

  if (confirm) {
    confirm.toggleAttribute('hidden', isRequest);
  }
}

function setRouteVisibility(targetRoute: string): void {
  document.querySelectorAll<HTMLElement>('section[data-route]').forEach((section) => {
    const isActive = section.dataset.route === targetRoute;
    section.hidden = !isActive;
    section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
}

function setRouteLinks(view: AuthView, targetRoute: string, isAuthView: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-route-link]').forEach((link) => {
    const route = link.dataset.routeLink;
    if (!route) return;
    const isActive = route === view || route === targetRoute || (route === 'auth' && isAuthView);
    link.classList.toggle('active', isActive);
    link.toggleAttribute('aria-current', isActive);
  });
}

export function applyRouteFromHash(): void {
  const hash = window.location.hash.replace('#', '');
  const view = getViewFromHash(hash);
  const isAuthView = (AUTH_VIEWS as readonly string[]).includes(hash);
  const targetRoute = isAuthView || !hash ? 'auth' : hash;

  setRouteVisibility(targetRoute);
  setRouteLinks(view, targetRoute, isAuthView);
  showAuthView(view);
}

export function initAuthTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-auth-tab]').forEach((tab) => {
    if (tab.dataset.bound === 'true') return;
    tab.dataset.bound = 'true';
    tab.addEventListener('click', () => {
      const target = tab.dataset.authTab;
      if (!target || !(AUTH_VIEWS as readonly string[]).includes(target)) return;
      const newHash = `#${target}`;

      if (window.location.hash === newHash) {
        showAuthView(target as AuthView);
      } else {
        window.location.hash = newHash;
      }
    });
  });
}

export function initAuthRouting(): void {
  document.querySelectorAll<HTMLElement>('[data-auth-scroll]').forEach((trigger) => {
    if (trigger.dataset.bound === 'true') return;
    trigger.dataset.bound = 'true';

    trigger.addEventListener('click', () => {
      const target = trigger.dataset.authScroll as AuthView | undefined;
      if (!target || !(AUTH_VIEWS as readonly string[]).includes(target)) return;

      requestAuthScroll(target);
    });
  });

  window.addEventListener('hashchange', applyRouteFromHash);
  applyRouteFromHash();
}
