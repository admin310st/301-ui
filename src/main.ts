import { logout } from '@api/auth';
import { initLoginForm } from '@forms/login';
import { initRegisterForm } from '@forms/register';
import { initResetConfirmForm } from '@forms/reset-confirm';
import { initResetRequestForm } from '@forms/reset-request';
import { initResetVerifyFlow } from '@forms/reset-verify';
import { initVerifyFlow } from '@forms/verify';
import { initCloudflareWizard } from '@forms/cf-wizard';
import { initGithubOAuth } from '@social/github';
import { initGoogleOAuth } from '@social/google';
import { applyInitialAuthState, handleLogoutDom } from '@ui/auth-dom';
import { initGlobalNotice } from '@ui/globalNotice';
import { initTurnstile } from './turnstile';
import { showGlobalMessage } from '@ui/notifications';
import { initVisibilityController } from '@ui/visibility';
import { applyTranslations, initLangSwitcher } from '@i18n/dom';
import { t } from '@i18n';
import { initTheme, initThemeToggle } from '@ui/theme';
import { applyRouteFromHash, initAuthRouting, initAuthTabs } from '@ui/auth-routing';
import { initPasswordToggles } from '@ui/password-toggle';

function bindLogoutButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-action="logout"]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      await logout();
      handleLogoutDom();
      showGlobalMessage('success', t('auth.messages.logoutSuccess'));
      window.location.hash = '#login';
      applyRouteFromHash();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  applyTranslations();
  initLangSwitcher();
  initGlobalNotice();
  initVisibilityController();
  await applyInitialAuthState();
  await initTurnstile();

  initAuthRouting();
  initLoginForm();
  initRegisterForm();
  initResetRequestForm();
  initResetConfirmForm();
  initResetVerifyFlow();
  initVerifyFlow();
  initGoogleOAuth();
  initGithubOAuth();
  initCloudflareWizard();
  initAuthTabs();
  bindLogoutButtons();
  initThemeToggle();
  initPasswordToggles();
});
