import { logout } from '@api/auth';
import { initLoginForm } from '@forms/login';
import { initRegisterForm } from '@forms/register';
import { initResetConfirmForm } from '@forms/reset-confirm';
import { initResetRequestForm } from '@forms/reset-request';
import { initResetVerifyFlow } from '@forms/reset-verify';
import { initVerifyFlow } from '@forms/verify';
import { initGithubOAuth } from '@social/github';
import { initGoogleOAuth } from '@social/google';
import { applyInitialAuthState, handleLogoutDom } from '@ui/auth-dom';
import { initGlobalNotice, showGlobalNotice } from '@ui/globalNotice';
import { injectIconSprite, processDataIconAttributes, initIconObserver } from '@ui/icons';
import { lazyInitTurnstile } from './turnstile';
import { showGlobalMessage } from '@ui/notifications';
import { initVisibilityController } from '@ui/visibility';
import { applyTranslations, initLangSwitcher } from '@i18n/dom';
import { t } from '@i18n';
import { initTheme, initThemeToggle } from '@ui/theme';
import { applyRouteFromHash, initAuthRouting, initAuthTabs } from '@ui/auth-routing';
import { initPasswordToggles } from '@ui/password-toggle';
import { initHeaderScroll } from '@ui/header-scroll';
import { initSidebarToggle } from '@ui/sidebar-toggle';
import { initSidebarSearch } from '@ui/sidebar-search';
import { initSidebarNav } from '@ui/sidebar-nav';
import { initIntegrationsPage, openConnectCloudflareDrawer, openConnectNamecheapDrawer } from '@ui/integrations';
import { initAccountPage } from '@forms/account';
import { initAccountEdit } from '@forms/account-edit';
import { initDomainsPage } from '@domains/domains';
import { initRedirectsPage } from '@redirects/redirects';
import { initProjectsPage } from '@ui/projects';
import { initProjectCreate } from '@forms/project-create';
import { initProjectEdit } from '@forms/project-edit';
import { initProjectAttachIntegration } from '@forms/project-attach-integration';
import { initProjectAddDomain } from '@domains/project-add-domain';
import { initSitesPage } from '@ui/sites';
import { initSiteCreate } from '@forms/site-create';
import { initSiteEdit } from '@forms/site-edit';
import { initSiteDomains } from '@domains/site-domains';
import { initTdsPage } from './streams/tds-page';
import { initDrawer as initTdsDrawer } from './streams/drawer';
import { initDialogCloseHandlers } from '@ui/dialog';
import { initPageLoadIndicator, showLoading, hideLoading, withLoading } from '@ui/loading-indicator';
import { initDashboardPage, initSidebarOnboarding } from '@ui/dashboard';

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
    window.location.hash = '#login';
    applyRouteFromHash();
  });
}

// Initialize page load indicator early (shows loading bar during page load)
initPageLoadIndicator();

document.addEventListener('DOMContentLoaded', async () => {
  await injectIconSprite();
  processDataIconAttributes();
  initIconObserver(); // Watch for dynamically added icons

  initTheme();
  applyTranslations();
  initLangSwitcher();
  initGlobalNotice();
  initVisibilityController();
  await applyInitialAuthState();

  // Only initialize Turnstile if there are widgets on the page (index.html auth forms)
  // Lazy-load: defer script injection until auth card is near viewport (avoids third-party cookies on initial audit)
  if (document.querySelector('.turnstile-widget')) {
    lazyInitTurnstile(document.querySelector('.auth-card'));
  }

  initAuthRouting();
  initLoginForm();
  initRegisterForm();
  initResetRequestForm();
  initResetConfirmForm();
  initResetVerifyFlow();
  initVerifyFlow();
  initGoogleOAuth();
  initGithubOAuth();
  initAuthTabs();
  bindLogoutButtons();
  initThemeToggle();
  initPasswordToggles();
  initHeaderScroll();
  initSidebarToggle();
  initSidebarNav();          // First: render nav items
  initSidebarSearch();       // Then: attach search to rendered items
  initSidebarOnboarding();   // Update onboarding indicator on all pages
  initDashboardPage();
  initIntegrationsPage();
  initAccountPage();
  initAccountEdit();
  initDomainsPage();
  initRedirectsPage();
  initProjectsPage();
  initProjectCreate();
  initProjectEdit();
  initProjectAttachIntegration();
  initProjectAddDomain();
  initSitesPage();
  initSiteCreate();
  initSiteEdit();
  initSiteDomains();
  initTdsPage();
  initTdsDrawer();
  initDialogCloseHandlers();

  // Global handler for "Connect Cloudflare" buttons (dashboard, integrations, etc.)
  document.querySelectorAll('[data-action="connect-cloudflare"]').forEach((btn) => {
    btn.addEventListener('click', () => openConnectCloudflareDrawer());
  });

  // Global handler for "Connect NameCheap" buttons
  document.querySelectorAll('[data-action="connect-namecheap"]').forEach((btn) => {
    btn.addEventListener('click', () => openConnectNamecheapDrawer());
  });

  // Expose utilities for testing in Style Guide and use in other modules
  (window as any).showGlobalNotice = showGlobalNotice;
  (window as any).showLoading = showLoading;
  (window as any).hideLoading = hideLoading;
  (window as any).withLoading = withLoading;
  (window as any).injectIcons = processDataIconAttributes;
});