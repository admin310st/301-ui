/**
 * Lightweight entry point for public content pages:
 * about, privacy, terms, security, docs, 404.
 *
 * Includes only: icons, theme, i18n, auth state/visibility, header scroll,
 * global notice, and logout handler. Excludes all dashboard, form, sidebar,
 * drawer, and page controller code.
 */
import { logout } from '@api/auth';
import { applyInitialAuthState, handleLogoutDom } from '@ui/auth-dom';
import { initGlobalNotice } from '@ui/globalNotice';
import { injectIconSprite, processDataIconAttributes, initIconObserver } from '@ui/icons';
import { showGlobalMessage } from '@ui/notifications';
import { initVisibilityController } from '@ui/visibility';
import { applyTranslations, initLangSwitcher } from '@i18n/dom';
import { t } from '@i18n';
import { initTheme, initThemeToggle } from '@ui/theme';
import { initHeaderScroll } from '@ui/header-scroll';

function bindLogoutButtons(): void {
  document.addEventListener('click', async (event) => {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-action="logout"], [data-action="logout-utility"]'
    );
    if (!trigger) return;

    event.preventDefault();
    await logout();
    handleLogoutDom();
    showGlobalMessage('success', t('auth.messages.logoutSuccess'));
    window.location.href = '/';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await injectIconSprite();
  processDataIconAttributes();
  initIconObserver();

  initTheme();
  applyTranslations();
  initLangSwitcher();
  initGlobalNotice();
  initVisibilityController();
  await applyInitialAuthState();

  bindLogoutButtons();
  initThemeToggle();
  initHeaderScroll();

  // Expose for dynamic icon injection
  (window as any).injectIcons = processDataIconAttributes;
});
