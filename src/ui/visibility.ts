import type { AuthState } from '@state/auth-state';
import { getAuthState, onAuthChange } from '@state/auth-state';
import { qsa } from './dom';

const PROTECTED_PAGES = ['/dashboard', '/integrations', '/account',
  '/domains', '/projects', '/sites', '/redirects', '/streams'];

function goToDashboard(): void {
  const DASH = '/dashboard.html';
  const isLoginPage =
    /(^|\/)(index\.html)?$/.test(location.pathname) ||
    location.pathname.endsWith('/login') ||
    Boolean(location.hash.match(/^#(login|register|reset)/));

  if (isLoginPage) location.assign(DASH);
}

function goToLoginIfProtected(): void {
  const path = location.pathname.replace(/\.html$/, '');
  if (PROTECTED_PAGES.includes(path)) {
    location.assign('/');
  }
}

// safe default on first paint
document.querySelectorAll('[data-onlogin]').forEach((node) => {
  (node as HTMLElement).hidden = true;
});
document.querySelectorAll('[data-onlogout]').forEach((node) => {
  (node as HTMLElement).hidden = false;
});

export function applyAuthDom(state: AuthState): void {
  const loggedIn = Boolean(state?.user);
  const email = state?.user?.email || '';
  const name = state?.user?.name || '';
  const role = state?.user?.user_type || 'client';

  qsa<HTMLElement>('[data-onlogin]').forEach((node) => {
    node.hidden = !loggedIn;
    node.toggleAttribute('aria-hidden', !loggedIn);
  });

  qsa<HTMLElement>('[data-onlogout]').forEach((node) => {
    node.hidden = loggedIn;
    node.toggleAttribute('aria-hidden', loggedIn);
  });

  qsa<HTMLElement>('[data-auth-email], [data-user-email]').forEach((node) => {
    node.textContent = email || name;
  });

  qsa<HTMLElement>('[data-user-name]').forEach((node) => {
    node.textContent = name || email || 'User';
  });

  qsa<HTMLElement>('[data-user-role]').forEach((node) => {
    node.textContent = role;
  });

  if (loggedIn) {
    goToDashboard();
  } else {
    goToLoginIfProtected();
  }
}

export function initVisibilityController(): void {
  applyAuthDom(getAuthState());
  onAuthChange((state) => {
    applyAuthDom(state);
  });
}

/**
 * Re-apply auth state to DOM (useful after i18n updates)
 */
export function refreshAuthDisplay(): void {
  applyAuthDom(getAuthState());
}
