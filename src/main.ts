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
import { initUtilityBarScroll } from '@ui/utility-bar-scroll';

/**
 * Inject SVG sprite with icons once per page.
 */
async function injectIconSprite() {
  const res = await fetch('/icons-sprite.svg', { cache: 'force-cache' });
  if (!res.ok) return;

  let svgText = await res.text();

  // Removing the parasitic Cloudflare script
  svgText = svgText.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

  if (!svgText.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgText = svgText.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const wrap = document.createElement('div');
  wrap.style.position = 'absolute';
  wrap.style.width = '0';
  wrap.style.height = '0';
  wrap.style.overflow = 'hidden';
  wrap.innerHTML = svgText;

  const svg = wrap.querySelector('svg');
  if (svg) document.body.prepend(svg);
}

/**
 * Process all [data-icon] attributes and inject SVG <use> elements.
 * Example: data-icon="mono/home" → <svg><use href="/icons-sprite.svg#i-mono-home"></use></svg>
 */
function processDataIconAttributes() {
  document.querySelectorAll('[data-icon]').forEach((el) => {
    const iconName = el.getAttribute('data-icon');
    if (!iconName) return;

    // Convert "mono/home" to "i-mono-home"
    const symbolId = `i-${iconName.replace('/', '-')}`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');

    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `/icons-sprite.svg#${symbolId}`);

    svg.appendChild(use);
    el.appendChild(svg);
  });
}

function initSidebarToggle(): void {
  const LS_KEY = 'ui.sidebar.collapsed';
  const aside = document.getElementById('app-sidebar');
  const btn = document.querySelector('[data-sidebar-toggle]');
  if (!aside || !btn) return;

  const apply = () => {
    const collapsed = localStorage.getItem(LS_KEY) === '1';
    aside.classList.toggle('is-collapsed', collapsed);

    const iconName = collapsed ? 'mono/chevron-down' : 'mono/chevron-up';
    const symbolId = `i-${iconName.replace('/', '-')}`;
    const iconEl = btn.querySelector('.icon');

    if (iconEl) {
      iconEl.setAttribute('data-icon', iconName);
      const use = iconEl.querySelector('use');
      if (use) {
        use.setAttribute('href', `/icons-sprite.svg#${symbolId}`);
      }
    }
  };

  btn.addEventListener('click', () => {
    const next = localStorage.getItem(LS_KEY) === '1' ? '0' : '1';
    localStorage.setItem(LS_KEY, next);
    apply();
  });

  apply();
}


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

document.addEventListener('DOMContentLoaded', async () => {
  await injectIconSprite();
  processDataIconAttributes();

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
  initUtilityBarScroll();
  initSidebarToggle();
});