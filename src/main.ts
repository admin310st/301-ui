import { logout } from '@api/auth';
import { initLoginForm } from '@forms/login';
import { initRegisterForm } from '@forms/register';
import { initResetConfirmForm } from '@forms/reset-confirm';
import { initResetRequestForm } from '@forms/reset-request';
import { initVerifyForm } from '@forms/verify';
import { initGithubOAuth } from '@social/github';
import { initGoogleOAuth } from '@social/google';
import { initAuthState } from '@state/auth-state';
import { initTurnstile } from './turnstile';
import { showGlobalMessage } from '@ui/notifications';
import { initVisibilityController } from '@ui/visibility';

function bindLogoutButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-action="logout"]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      await logout();
      showGlobalMessage('success', 'Logged out');
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initVisibilityController();
  await initAuthState();
  await initTurnstile();

  initLoginForm();
  initRegisterForm();
  initResetRequestForm();
  initResetConfirmForm();
  initVerifyForm();
  initGoogleOAuth();
  initGithubOAuth();
  bindLogoutButtons();
});
