const AUTH_VIEWS = ['login', 'register', 'reset', 'reset-confirm', 'verify'] as const;
export type AuthView = (typeof AUTH_VIEWS)[number];

function getViewFromHash(hash: string): AuthView {
  const normalized = hash.replace('#', '') as AuthView;
  return (AUTH_VIEWS as readonly string[]).includes(normalized) ? normalized : 'login';
}

export function showAuthView(view: AuthView): void {
  document.querySelectorAll<HTMLElement>('[data-auth-view]').forEach((el) => {
    const isActive = el.dataset.authView === view;
    el.hidden = !isActive;
    el.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  document.querySelectorAll<HTMLElement>('[data-auth-tab]').forEach((tab) => {
    const isActive = tab.dataset.authTab === view;
    tab.classList.toggle('is-active', isActive);
    tab.toggleAttribute('aria-current', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });
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
