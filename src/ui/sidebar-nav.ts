import { t } from '@i18n';

/**
 * Navigation item configuration
 */
export interface NavItem {
  id: string;
  label: string;        // Fallback label (EN)
  labelKey: string;     // i18n key
  icon: string;         // Icon name (e.g., 'mono/home')
  href: string;         // Link URL
  badge?: string | number;
  notificationIcon?: string; // Notification icon (e.g., 'mono/circle-alert')
  notificationColor?: 'warning' | 'danger'; // Notification icon color
  notificationTitle?: string; // Tooltip for notification icon
  isActive?: (path: string) => boolean;
}

/**
 * Dashboard navigation configuration
 * This is the single source of truth for sidebar navigation.
 */
export const DASHBOARD_NAV: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    labelKey: 'layout.nav.overview',
    icon: 'mono/home',
    href: '/dashboard.html',
    isActive: (path) => path === '/dashboard.html' || path === '/dashboard' || path === '/',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    labelKey: 'layout.nav.integrations',
    icon: 'mono/puzzle',
    href: '/integrations.html',
    isActive: (path) => path.includes('/integrations'),
  },
  {
    id: 'projects',
    label: 'Projects',
    labelKey: 'layout.nav.projects',
    icon: 'mono/layers',
    href: '/projects.html',
    isActive: (path) => path.includes('/projects'),
  },
  {
    id: 'domains',
    label: 'Domains',
    labelKey: 'layout.nav.domains',
    icon: 'mono/dns',
    href: '/domains.html',
    // badge and health indicator updated dynamically
    // updateDomainsBadge() - shows domain count
    // updateDomainsHealthIndicator() - shows health status (danger/warning/success)
    isActive: (path) => path.includes('/domains'),
  },
  {
    id: 'redirects',
    label: 'Redirects',
    labelKey: 'layout.nav.redirects',
    icon: 'mono/arrow-right',
    href: '/redirects.html',
    isActive: (path) => path.includes('/redirects'),
  },
  {
    id: 'sites',
    label: 'Sites',
    labelKey: 'layout.nav.sites',
    icon: 'mono/landing',
    href: '/sites.html',
    isActive: (path) => path.includes('/sites'),
  },
  {
    id: 'streams',
    label: 'Streams',
    labelKey: 'layout.nav.streams',
    icon: 'mono/directions-fork',
    href: '/streams.html',
    isActive: (path) => path.includes('/streams'),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    labelKey: 'layout.nav.analytics',
    icon: 'mono/analytics',
    href: '/analytics.html',
    isActive: (path) => path.includes('/analytics'),
  },
];

/**
 * Secondary navigation items (Settings, Account)
 * These appear after a spacer in the sidebar
 */
export const DASHBOARD_NAV_SECONDARY: NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    labelKey: 'layout.nav.settings',
    icon: 'mono/cog',
    href: '/settings.html',
    isActive: (path) => path.includes('/settings'),
  },
  {
    id: 'account',
    label: 'Account',
    labelKey: 'layout.nav.account',
    icon: 'mono/user',
    href: '/account.html',
    isActive: (path) => path.includes('/account'),
  },
];

/**
 * Render a single navigation item
 */
function renderNavItem(item: NavItem, currentPath: string): string {
  const isActive = item.isActive?.(currentPath) || false;
  const activeClass = isActive ? ' is-active' : '';
  const label = t(item.labelKey as any) || item.label;

  const notificationColorClass = item.notificationColor === 'danger' ? ' notification-icon--danger' : '';
  const notificationTitle = item.notificationTitle ? ` title="${item.notificationTitle}"` : '';

  return `
    <a href="${item.href}" class="navitem${activeClass}" data-nav-id="${item.id}" data-label-en="${item.label}" data-label-key="${item.labelKey}">
      <span class="icon" data-icon="${item.icon}"></span>
      <span class="label" data-i18n="${item.labelKey}">${label}</span>
      ${item.badge ? `<span class="badge badge--sm">${item.badge}</span>` : ''}
      ${item.notificationIcon ? `<span class="notification-icon${notificationColorClass}"${notificationTitle}><span class="icon" data-icon="${item.notificationIcon}"></span></span>` : ''}
    </a>
  `;
}

/**
 * Render sidebar navigation from config
 */
export function renderSidebarNav(): void {
  const nav = document.querySelector<HTMLElement>('[data-sidebar-nav]');
  if (!nav) return;

  const currentPath = window.location.pathname;

  // Primary navigation items
  const primaryHtml = DASHBOARD_NAV.map(item => renderNavItem(item, currentPath)).join('');

  // Spacer before analytics (optional, can be removed if not needed)
  const analyticsIndex = DASHBOARD_NAV.findIndex(item => item.id === 'analytics');
  const beforeAnalytics = DASHBOARD_NAV.slice(0, analyticsIndex).map(item => renderNavItem(item, currentPath)).join('');
  const analytics = renderNavItem(DASHBOARD_NAV[analyticsIndex], currentPath);

  // Secondary navigation items
  const secondaryHtml = DASHBOARD_NAV_SECONDARY.map(item => renderNavItem(item, currentPath)).join('');

  nav.innerHTML = `
    ${beforeAnalytics}
    <div class="sidebar__spacer"></div>
    ${analytics}
    <div class="sidebar__spacer"></div>
    ${secondaryHtml}
  `;
}

/**
 * Update active state when navigation changes (for SPA routing)
 */
export function updateSidebarActive(path?: string): void {
  const currentPath = path || window.location.pathname;
  const items = document.querySelectorAll<HTMLElement>('[data-nav-id]');

  const allNavItems = [...DASHBOARD_NAV, ...DASHBOARD_NAV_SECONDARY];

  items.forEach(element => {
    const navId = element.dataset.navId;
    const config = allNavItems.find(item => item.id === navId);

    if (config) {
      const isActive = config.isActive?.(currentPath) || false;
      element.classList.toggle('is-active', isActive);
    }
  });
}

/**
 * Update domains badge count
 */
export function updateDomainsBadge(count: number): void {
  const domainsNav = document.querySelector('[data-nav-id="domains"]');
  if (!domainsNav) return;

  const existingBadge = domainsNav.querySelector('.badge');

  if (count > 0) {
    if (existingBadge) {
      existingBadge.textContent = count.toString();
    } else {
      // Create badge if it doesn't exist
      const badge = document.createElement('span');
      badge.className = 'badge badge--sm';
      badge.textContent = count.toString();

      const label = domainsNav.querySelector('.label');
      if (label && label.nextSibling) {
        domainsNav.insertBefore(badge, label.nextSibling);
      } else if (label) {
        label.after(badge);
      }
    }
  } else if (existingBadge) {
    // Remove badge if count is 0
    existingBadge.remove();
  }
}

/**
 * Update domains health indicator
 * @param status - 'danger' | 'warning' | 'success' | null
 */
export function updateDomainsHealthIndicator(
  status: 'danger' | 'warning' | 'success' | null
): void {
  const domainsNav = document.querySelector('[data-nav-id="domains"]');
  if (!domainsNav) return;

  let notificationIcon = domainsNav.querySelector('.notification-icon');

  if (status === null) {
    // Remove notification icon if no issues
    if (notificationIcon) {
      notificationIcon.remove();
    }
    return;
  }

  if (!notificationIcon) {
    // Create notification icon if it doesn't exist
    notificationIcon = document.createElement('span');
    notificationIcon.className = 'notification-icon';
    notificationIcon.innerHTML = '<span class="icon" data-icon="mono/circle-alert"></span>';
    domainsNav.appendChild(notificationIcon);
  }

  // Update color class
  notificationIcon.className = `notification-icon notification-icon--${status}`;

  // Update tooltip
  const tooltips = {
    danger: 'Critical issues detected',
    warning: 'Warnings detected',
    success: 'All domains healthy',
  };
  notificationIcon.setAttribute('title', tooltips[status]);
}

/**
 * Initialize sidebar navigation
 */
export function initSidebarNav(): void {
  renderSidebarNav();

  // Update active state on popstate (browser back/forward)
  window.addEventListener('popstate', () => {
    updateSidebarActive();
  });
}
