import type { AuthState } from '@state/auth-state';
import { onAuthChange } from '@state/auth-state';
import { qsa } from './dom';

function applyAuthDom(state: AuthState): void {
  const loggedIn = Boolean(state?.user);
  const email = state?.user?.email || '';
  const name = state?.user?.name || '';
  const role = state?.user?.role || state?.user?.type || 'client:owner';

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
}

export function initVisibilityController(): void {
  onAuthChange((state) => {
    applyAuthDom(state);
  });
}
