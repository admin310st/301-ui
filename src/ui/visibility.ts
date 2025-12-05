import { onAuthChange } from '@state/auth-state';
import { qsa } from './dom';

function applyAuthDom(isLoggedIn: boolean, email: string, role: string): void {
  qsa<HTMLElement>('[data-onlogin]').forEach((node) => {
    node.hidden = !isLoggedIn;
    node.toggleAttribute('aria-hidden', !isLoggedIn);
  });

  qsa<HTMLElement>('[data-onlogout]').forEach((node) => {
    node.hidden = isLoggedIn;
    node.toggleAttribute('aria-hidden', isLoggedIn);
  });

  qsa<HTMLElement>('[data-auth-email], [data-user-email]').forEach((node) => {
    node.textContent = email;
  });

  qsa<HTMLElement>('[data-user-role]').forEach((node) => {
    node.textContent = role;
  });
}

export function initVisibilityController(): void {
  onAuthChange((state) => {
    const role = state.user?.role || state.user?.type || 'client:owner';
    applyAuthDom(Boolean(state.user && state.token), state.user?.email ?? '', role);
  });
}
