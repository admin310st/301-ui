import { onAuthChange } from '@state/auth-state';
import { qsa } from './dom';

function applyAuthDom(isLoggedIn: boolean, email: string): void {
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
}

export function initVisibilityController(): void {
  onAuthChange((state) => {
    applyAuthDom(Boolean(state.user && state.token), state.user?.email ?? '');
  });
}
