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

const AUTH_VIEWS = ['login', 'register', 'reset'] as const;
type AuthView = (typeof AUTH_VIEWS)[number];

function setAuthView(view: AuthView): void {
  document.querySelectorAll<HTMLElement>('[data-auth-view]').forEach((form) => {
    const isActive = form.dataset.authView === view;
    form.toggleAttribute('hidden', !isActive);
    form.classList.toggle('is-active', isActive);
  });

  document.querySelectorAll<HTMLElement>('[data-auth-tab]').forEach((tab) => {
    const isActive = tab.dataset.authTab === view;
    tab.classList.toggle('is-active', isActive);
    tab.toggleAttribute('aria-current', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });
}

function initAuthTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-auth-tab]').forEach((tab) => {
    if (tab.dataset.bound === 'true') return;
    tab.dataset.bound = 'true';
    tab.addEventListener('click', () => {
      const target = tab.dataset.authTab;
      if (!target || !(AUTH_VIEWS as readonly string[]).includes(target)) return;
      const newHash = `#${target}`;

      if (window.location.hash === newHash) {
        setAuthView(target as AuthView);
      } else {
        window.location.hash = newHash;
      }
    });
  });
}

function applyRouteFromHash(): void {
  const hash = window.location.hash.replace('#', '') || 'login';
  const isAuthView = (AUTH_VIEWS as readonly string[]).includes(hash);
  const targetRoute = isAuthView ? 'auth' : hash;

  const sections = document.querySelectorAll<HTMLElement>('section[data-route]');
  sections.forEach((section) => {
    section.hidden = section.dataset.route !== targetRoute;
  });

  document.querySelectorAll<HTMLElement>('[data-route-link]').forEach((link) => {
    const route = link.dataset.routeLink;
    if (!route) return;
    const isActive = route === hash || (route === 'auth' && isAuthView);
    link.classList.toggle('active', isActive);
    link.toggleAttribute('aria-current', isActive);
  });

  if (isAuthView) setAuthView(hash as AuthView);
}

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

window.addEventListener('hashchange', applyRouteFromHash);

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  applyTranslations();
  initLangSwitcher();
  initGlobalNotice();
  initVisibilityController();
  await applyInitialAuthState();
  await initTurnstile();

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
  applyRouteFromHash();
  bindLogoutButtons();
  initThemeToggle();
});
