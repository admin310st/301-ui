import { logout } from '@api/auth';
import { initLoginForm } from '@forms/login';
import { initRegisterForm } from '@forms/register';
import { initResetConfirmForm } from '@forms/reset-confirm';
import { initResetRequestForm } from '@forms/reset-request';
import { initVerifyFlow } from '@forms/verify';
import { initGithubOAuth } from '@social/github';
import { initGoogleOAuth } from '@social/google';
import { applyInitialAuthState, handleLogoutDom } from '@ui/auth-dom';
import { initTurnstile } from './turnstile';
import { showGlobalMessage } from '@ui/notifications';
import { initVisibilityController } from '@ui/visibility';

function applyRouteFromHash(): void {
  const hash = window.location.hash.replace('#', '') || 'login';
  const sections = document.querySelectorAll<HTMLElement>('section[data-route]');
  sections.forEach((section) => {
    section.hidden = section.dataset.route !== hash;
  });

  document.querySelectorAll<HTMLElement>('[data-route-link]').forEach((link) => {
    const route = link.dataset.routeLink;
    if (!route) return;
    const isActive = route === hash;
    link.classList.toggle('active', isActive);
    link.toggleAttribute('aria-current', isActive);
  });
}

function bindLogoutButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-action="logout"]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      await logout();
      handleLogoutDom();
      showGlobalMessage('success', 'Вы вышли из аккаунта');
      window.location.hash = '#login';
      applyRouteFromHash();
    });
  });
}

window.addEventListener('hashchange', applyRouteFromHash);

document.addEventListener('DOMContentLoaded', async () => {
  initVisibilityController();
  await applyInitialAuthState();
  await initTurnstile();

  initLoginForm();
  initRegisterForm();
  initResetRequestForm();
  initResetConfirmForm();
  initVerifyFlow();
  initGoogleOAuth();
  initGithubOAuth();
  applyRouteFromHash();
  bindLogoutButtons();
});
