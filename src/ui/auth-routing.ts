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

  // Scroll to active view on mobile/tablet after tab switch
  if (isMobile() && activeView) {
    // Small delay to allow tab switch animation to start
    setTimeout(() => {
      if (!activeView) return;

      // Calculate position accounting for sticky header
      const header = document.querySelector('.site-header');
      const headerHeight = header?.getBoundingClientRect().height || 120;
      const elementTop = activeView.getBoundingClientRect().top + window.scrollY;
      const offset = headerHeight + 16; // header + small gap

      window.scrollTo({
        top: elementTop - offset,
        behavior: 'smooth',
      });
    }, 100);
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
  window.addEventListener('hashchange', applyRouteFromHash);
  applyRouteFromHash();
}
