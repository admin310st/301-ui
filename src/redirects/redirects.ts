/**
 * Redirects page UI logic
 *
 * Simple 301/302 domain redirects management
 * NOT to be confused with Streams/TDS (complex conditional routing)
 *
 * Works with real API via state.ts (multi-site support)
 */

import type { DomainRedirect } from './mock-data';
import { getDefaultFilters, hasActiveFilters, type ActiveFilters } from './filters-config';
import { renderFilterBar, initFilterUI } from './filters-ui';
import { initDrawer, openDrawer, openBulkAddDrawer } from './drawer';
import { openManageSiteDomainsDrawer } from '@domains/site-domains';
import { showDialog, hideDialog } from '@ui/dialog';
import { formatTooltipTimestamp, initTooltips } from '@ui/tooltip';
import { initSyncStatus } from './sync-status';
import { updateBulkActionsBar as updateBulkActions } from '@ui/bulk-actions';

// API integration
import {
  onStateChange,
  getState,
  refreshRedirects,
  updateDomainRedirect,
  removeRedirectFromDomain,
  bulkUpdateEnabled,
  markZoneSynced,
  getSortedDomains,
  type SiteContext,
} from './state';
import { initSiteSelector } from './site-selector';
import { adaptDomainsToLegacy } from './adapter';
import {
  updateRedirect,
  deleteRedirect,
  applyZoneRedirects,
} from '@api/redirects';
import { showGlobalNotice } from '@ui/globalNotice';

let currentRedirects: DomainRedirect[] = [];
let filteredRedirects: DomainRedirect[] = [];
const collapsedGroups = new Set<number>();  // Set of collapsed site_ids
const selectedRedirects = new Set<number>(); // Set of selected redirect IDs
let primaryDomains = new Set<string>(); // Set of primary domains (main domains of sites)
let activeFilters: ActiveFilters = getDefaultFilters(); // Active filters state

/**
 * Initialize redirects page
 */
export function initRedirectsPage(): void {
  const card = document.querySelector('[data-redirects-card]');
  if (!card) return;

  // Subscribe to state changes
  onStateChange((state) => {
    if (state.loading) {
      showLoadingState();
    } else if (state.error) {
      showErrorState(state.error);
    } else if (state.domains.length === 0 && state.selectedSiteIds.length > 0) {
      showEmptyState();
    } else if (state.domains.length > 0) {
      // Convert API data to legacy format using adapter
      // Domains are already sorted and have site_id, site_name
      const sortedDomains = getSortedDomains();

      // Adapt each domain with its site context
      const adapted = sortedDomains.map(domain => {
        return adaptDomainsToLegacy([domain], {
          site_id: domain.site_id,
          site_name: domain.site_name,
          site_tag: domain.site_tag,
          site_status: domain.site_status,
          project_id: state.projectId ?? undefined,
          project_name: state.projectName ?? undefined,
        })[0];
      });

      currentRedirects = adapted;
      filteredRedirects = [...currentRedirects];
      primaryDomains = calculatePrimaryDomains(currentRedirects);
      hideLoadingState();
      renderTable();
      initSyncStatus(currentRedirects);
    } else if (state.selectedSiteIds.length === 0) {
      // No sites selected
      showEmptyState();
    }
  });

  // Initialize project & site selectors (triggers data load on selection)
  initSiteSelector((_sites: SiteContext[]) => {
    // Clear selection on site change
    selectedRedirects.clear();
    collapsedGroups.clear();
  });

  // Setup search
  setupSearch();

  // Setup filters
  setupFilters();

  // Setup action buttons
  setupActions();

  // Initialize dropdown system globally (handles both page-header and table dropdowns)
  setupGlobalDropdowns();

  // Initialize drawer
  initDrawer();
}

/**
 * Show loading state
 */
function showLoadingState(): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const tableShell = document.querySelector('[data-table-shell]');
  const errorState = document.querySelector('[data-error-state]');

  if (loadingState) loadingState.hidden = false;
  if (emptyState) emptyState.hidden = true;
  if (tableShell) tableShell.hidden = true;
  if (errorState) errorState.hidden = true;
}

/**
 * Hide loading state
 */
function hideLoadingState(): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const tableShell = document.querySelector('[data-table-shell]');

  if (loadingState) loadingState.hidden = true;
  if (tableShell) tableShell.hidden = false;
}

/**
 * Show error state
 */
function showErrorState(message: string): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const tableShell = document.querySelector('[data-table-shell]');
  const errorState = document.querySelector('[data-error-state]');
  const errorMessage = document.querySelector('[data-error-message]');

  if (loadingState) loadingState.hidden = true;
  if (emptyState) emptyState.hidden = true;
  if (tableShell) tableShell.hidden = true;
  if (errorState) errorState.hidden = false;
  if (errorMessage) errorMessage.textContent = message;
}

/**
 * Show empty state
 */
function showEmptyState(): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const tableShell = document.querySelector('[data-table-shell]');

  if (loadingState) loadingState.hidden = true;
  if (emptyState) emptyState.hidden = false;
  if (tableShell) tableShell.hidden = true;
}

/**
 * Setup global dropdown handler for all dropdowns on the page
 * Handles both page-header dropdown (sync-chip) and table row dropdowns
 */
function setupGlobalDropdowns(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Handle sync-chip dropdown specifically
    const syncChipTrigger = target.closest('[data-sync-chip] .dropdown__trigger');
    if (syncChipTrigger) {
      e.preventDefault();
      e.stopPropagation();

      const syncChipDropdown = document.querySelector('[data-sync-chip]');
      if (!syncChipDropdown) return;

      // Use display property as single source of truth
      const menu = syncChipDropdown.querySelector('.dropdown__menu') as HTMLElement;
      const isOpen = menu ? menu.style.display === 'block' : false;

      // Close all other dropdowns
      document.querySelectorAll('.dropdown--open').forEach((other) => {
        if (other !== syncChipDropdown) {
          other.classList.remove('dropdown--open');
          const otherTrigger = other.querySelector('.dropdown__trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          const otherMenu = other.querySelector('.dropdown__menu') as HTMLElement;
          if (otherMenu) {
            otherMenu.classList.remove('dropdown__menu--up', 'dropdown__menu--right');
            otherMenu.style.display = 'none';
          }
        }
      });

      // Toggle sync-chip
      if (isOpen) {
        syncChipDropdown.classList.remove('dropdown--open');
        syncChipTrigger.setAttribute('aria-expanded', 'false');
        if (menu) {
          menu.classList.remove('dropdown__menu--up', 'dropdown__menu--right');
          menu.style.display = 'none';
        }
      } else {
        syncChipDropdown.classList.add('dropdown--open');
        syncChipTrigger.setAttribute('aria-expanded', 'true');
        if (menu) {
          menu.style.display = 'block';
        }
      }
      return;
    }

    // Handle regular table dropdowns
    const trigger = target.closest('.dropdown__trigger');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();

      const dropdown = trigger.closest('.dropdown') || trigger.closest('[data-dropdown]');
      if (!dropdown) return;

      const isOpen = dropdown.classList.contains('dropdown--open');

      // Close all other dropdowns
      document.querySelectorAll('.dropdown--open').forEach((other) => {
        if (other !== dropdown) {
          other.classList.remove('dropdown--open');
          const otherTrigger = other.querySelector('.dropdown__trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          const otherMenu = other.querySelector('.dropdown__menu');
          if (otherMenu) otherMenu.classList.remove('dropdown__menu--up', 'dropdown__menu--right');
        }
      });

      // Toggle current dropdown
      if (isOpen) {
        dropdown.classList.remove('dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
        const menu = dropdown.querySelector('.dropdown__menu');
        if (menu) menu.classList.remove('dropdown__menu--up', 'dropdown__menu--right');
      } else {
        dropdown.classList.add('dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => {
          adjustDropdownPosition(dropdown);
        });
      }
      return;
    }

    // Click outside - close all dropdowns
    const clickedOutside = !target.closest('.dropdown') && !target.closest('[data-dropdown]');
    if (clickedOutside) {
      document.querySelectorAll('.dropdown--open').forEach((dropdown) => {
        dropdown.classList.remove('dropdown--open');
        const ddTrigger = dropdown.querySelector('.dropdown__trigger');
        if (ddTrigger) ddTrigger.setAttribute('aria-expanded', 'false');
        const menu = dropdown.querySelector('.dropdown__menu') as HTMLElement;
        if (menu) {
          menu.classList.remove('dropdown__menu--up', 'dropdown__menu--right');
          // Force hide sync-chip menu
          if (dropdown.hasAttribute('data-sync-chip')) {
            menu.style.display = 'none';
          }
        }
      });
    }
  });
}

/**
 * Adjust dropdown position to prevent overflow
 */
function adjustDropdownPosition(dropdown: Element): void {
  const menu = dropdown.querySelector('.dropdown__menu') as HTMLElement;
  if (!menu) return;

  const menuRect = menu.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Check if dropdown would overflow bottom
  if (menuRect.bottom > viewportHeight - 16) {
    menu.classList.add('dropdown__menu--up');
  }

  // Check if dropdown would overflow right
  if (menuRect.right > viewportWidth - 16) {
    menu.classList.add('dropdown__menu--right');
  }
}

/**
 * Calculate which domains are primary domains (main domains of sites)
 * Primary domain: role='acceptor' (receives traffic)
 */
function calculatePrimaryDomains(redirects: DomainRedirect[]): Set<string> {
  const primary = new Set<string>();

  for (const redirect of redirects) {
    if (redirect.role === 'acceptor') {
      primary.add(redirect.domain);
    }
  }

  return primary;
}

/**
 * Get arrow indicator color and title for redirect
 * - Standard redirect (to acceptor): green (301) or orange (302)
 * - Custom redirect (to different URL): pink (danger)
 */
function getArrowStyle(redirect: DomainRedirect): { color: string; title: string } {
  if (!redirect.target_url) {
    return { color: 'text-muted', title: 'No redirect' };
  }

  // Extract host from target URL
  const targetHost = redirect.target_url
    .replace('https://', '')
    .replace('http://', '')
    .split('/')[0];

  // Check if target is a primary domain (standard redirect)
  const isStandardRedirect = primaryDomains.has(targetHost);

  if (isStandardRedirect) {
    // Standard redirect to acceptor
    const redirectType = redirect.redirect_code === 301 ? 'Permanent (301)' : 'Temporary (302)';
    const color = redirect.redirect_code === 301 ? 'text-ok' : 'text-warning';
    return { color, title: redirectType };
  } else {
    // Custom redirect to different URL
    const redirectType = redirect.redirect_code === 301 ? 'Custom (301)' : 'Custom (302)';
    return { color: 'text-danger', title: `${redirectType} - ${targetHost}` };
  }
}

/**
 * Load domain redirects (mock data for now)
 */
function loadRedirects(): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const tableShell = document.querySelector('[data-table-shell]');

  if (loadingState) loadingState.hidden = false;

  // Simulate loading
  setTimeout(() => {
    currentRedirects = [...mockDomainRedirects];
    filteredRedirects = [...currentRedirects];
    primaryDomains = calculatePrimaryDomains(currentRedirects);

    if (loadingState) loadingState.hidden = true;

    if (currentRedirects.length === 0) {
      if (emptyState) emptyState.hidden = false;
    } else {
      renderTable();
      if (tableShell) tableShell.hidden = false;

      // Initialize sync status indicator
      initSyncStatus(currentRedirects);
    }
  }, 300);
}

/**
 * Render redirects table as flat list (no project grouping)
 * Domains are already sorted: acceptor first, then donors, then reserve
 */
function renderTable(): void {
  const tbody = document.querySelector('[data-redirects-tbody]');
  if (!tbody) return;

  // Render flat table - domains are pre-sorted (acceptor → donors → reserve)
  const html = filteredRedirects.map((redirect, index) => {
    const isPrimary = redirect.role === 'acceptor';
    const isLastRow = index === filteredRedirects.length - 1;

    if (isPrimary) {
      // Primary domain (acceptor/target) - site header row
      return renderPrimaryDomainRow(redirect);
    } else {
      // Donor or reserve domain
      return renderDomainRow(redirect, isLastRow);
    }
  }).join('');

  tbody.innerHTML = html;

  // Set indeterminate state for group checkboxes
  const groupCheckboxes = tbody.querySelectorAll('[data-indeterminate="true"]');
  groupCheckboxes.forEach(cb => {
    (cb as HTMLInputElement).indeterminate = true;
  });

  // Update global select-all checkbox state
  updateGlobalCheckbox();

  // Initialize tooltips for status badges
  initTooltips();

  // Note: Dropdowns handled by global setupGlobalDropdowns() in initRedirectsPage()

  // Update counts
  const shownCount = document.querySelector('[data-shown-count]');
  const totalCount = document.querySelector('[data-total-count]');
  if (shownCount) shownCount.textContent = String(filteredRedirects.length);
  if (totalCount) totalCount.textContent = String(currentRedirects.length);
}

/**
 * Render primary domain (acceptor/target) row
 * Unified function for both flat and grouped views
 *
 * @param redirect - Primary domain data
 * @param options - Optional params for grouped view (groupId, donorDomains for pre-computed data)
 */
function renderPrimaryDomainRow(
  redirect: DomainRedirect,
  options?: {
    groupId?: number;
    donorDomains?: DomainRedirect[];  // Pre-computed donors (grouped view)
  }
): string {
  const { groupId, donorDomains } = options || {};

  // Get donor domains: use pre-computed if provided, otherwise compute from filtered
  const siteDonors = donorDomains || filteredRedirects.filter(r =>
    r.site_id === redirect.site_id && r.role !== 'acceptor'
  );

  // Calculate checkbox state for mass-select
  const selectedDonors = siteDonors.filter(d => selectedRedirects.has(d.id));
  const allDonorsSelected = siteDonors.length > 0 && selectedDonors.length === siteDonors.length;
  const someDonorsSelected = selectedDonors.length > 0 && selectedDonors.length < siteDonors.length;

  // Count donors with redirects for badge
  const actualRedirects = siteDonors.filter(r => r.has_redirect);

  // Check if the acceptor itself has a redirect configured (problematic state after primary change)
  const acceptorHasRedirect = redirect.has_redirect && redirect.target_url;

  // Redirect badge with color coding OR red arrow if acceptor has redirect
  let redirectBadge = '';
  if (acceptorHasRedirect) {
    // Acceptor has its own redirect - show red danger arrow (needs attention)
    redirectBadge = `<span class="text-danger" style="font-size: 1.125rem; line-height: 1;" title="Primary domain has redirect configured! Click to clear.">→</span>`;
  } else if (actualRedirects.length > 0) {
    const has301 = actualRedirects.some(r => r.redirect_code === 301);
    const has302 = actualRedirects.some(r => r.redirect_code === 302);
    const badgeColor = has301 && !has302 ? 'text-ok' : 'text-warning';

    redirectBadge = `<span class="badge badge--sm badge--neutral" title="${actualRedirects.length} domain${actualRedirects.length > 1 ? 's' : ''} redirect here">
      <span class="icon ${badgeColor}">←</span>
      <span>${actualRedirects.length}</span>
    </span>`;
  }

  // Site type badge OR redirect target if acceptor has redirect
  let targetDisplay = '';
  if (acceptorHasRedirect) {
    // Show where the acceptor redirects to (problematic state)
    const targetHost = redirect.target_url!.replace('https://', '').replace('http://', '').split('/')[0];
    targetDisplay = `<span class="text-danger" title="Primary domain redirects to ${redirect.target_url}">${targetHost}</span>`;
  } else {
    targetDisplay = getSiteTypeBadge(redirect.site_type);
  }

  // Domain display with mass-select checkbox
  const domainDisplay = getDomainDisplay(redirect, true, true, allDonorsSelected, someDonorsSelected, redirectBadge);

  const activityDisplay = getActivityDisplay(redirect);
  const statusDisplay = getStatusDisplay(redirect);
  const actions = getSiteHeaderActions(redirect, acceptorHasRedirect);

  // Row classes: add level-1 for grouped view, paused for paused/archived sites
  const isPaused = redirect.site_status === 'paused' || redirect.site_status === 'archived';
  const baseClass = groupId !== undefined
    ? 'table__primary-domain table__row--level-1'
    : 'table__primary-domain';
  const rowClass = isPaused ? `${baseClass} table__row--paused` : baseClass;

  // Group ID attribute for grouped view
  const groupAttr = groupId !== undefined ? `data-group-id="${groupId}"` : '';

  return `
    <tr data-redirect-id="${redirect.id}" ${groupAttr} data-site-id="${redirect.site_id}" class="${rowClass}">
      <td data-priority="critical" class="table__cell-domain">
        ${domainDisplay}
      </td>
      <td data-priority="critical" class="table__cell-target">
        ${targetDisplay}
      </td>
      <td data-priority="medium" class="table__cell-activity">
        ${activityDisplay}
      </td>
      <td data-priority="high" class="table__cell-status">
        ${statusDisplay}
      </td>
      <td data-priority="critical" class="table__cell-actions">
        <div class="table-actions table-actions--inline">
          ${actions}
        </div>
      </td>
      <td data-priority="critical" class="table__cell-checkbox">
        <span class="icon text-muted" data-icon="mono/lock" title="Primary domain cannot be selected"></span>
      </td>
    </tr>
  `;
}

/**
 * Get site type badge HTML
 */
function getSiteTypeBadge(siteType: string): string {
  const badges: Record<string, string> = {
    landing: '<span class="badge badge--sm badge--success">Landing</span>',
    tds: '<span class="badge badge--sm badge--brand">TDS</span>',
    hybrid: '<span class="badge badge--sm badge--warning">Hybrid</span>',
  };
  return badges[siteType] || '';
}

/**
 * Render donor/reserve domain row
 * Has visual indentation with left border line to show hierarchy under acceptor
 */
function renderDomainRow(redirect: DomainRedirect, _isLastRow: boolean): string {
  const isSelected = selectedRedirects.has(redirect.id);
  const isPaused = redirect.site_status === 'paused' || redirect.site_status === 'archived';
  const statusBadge = redirect.domain_status !== 'active'
    ? `<span class="badge badge--xs badge--${redirect.domain_status === 'parked' ? 'neutral' : 'danger'}">${redirect.domain_status}</span>`
    : '';

  // Arrow indicator for donors with redirect
  let arrowIndicator = '';
  if (redirect.has_redirect && redirect.target_url) {
    const { color: arrowColor, title: arrowTitle } = getArrowStyle(redirect);
    arrowIndicator = `<span class="${arrowColor}" style="font-size: 1.125rem; line-height: 1;" title="${arrowTitle}">→</span>`;
  }

  // Child row: indented with left border line
  const domainDisplay = `
    <div class="table-cell-stack table-cell-stack--child">
      <span class="table-cell-main">${redirect.domain}</span>
      ${statusBadge}
      ${arrowIndicator}
    </div>
  `;

  const targetDisplay = getTargetDisplay(redirect, false);
  const activityDisplay = getActivityDisplay(redirect);
  const statusDisplay = getStatusDisplay(redirect);
  const actions = getRowActions(redirect);

  // Paused sites: show disabled checkbox with tooltip
  const checkbox = isPaused
    ? `
      <input
        type="checkbox"
        class="checkbox"
        disabled
        title="Site is ${redirect.site_status} — excluded from bulk actions"
        aria-label="${redirect.domain} (${redirect.site_status})"
      />
    `
    : `
      <input
        type="checkbox"
        class="checkbox"
        data-redirect-checkbox
        data-redirect-id="${redirect.id}"
        ${isSelected ? 'checked' : ''}
        aria-label="Select ${redirect.domain}"
      />
    `;

  // Row classes: add muted styling for paused sites
  const rowClass = isPaused
    ? 'table__domain-row table__row--child table__row--paused'
    : 'table__domain-row table__row--child';

  return `
    <tr data-redirect-id="${redirect.id}" data-site-id="${redirect.site_id}" class="${rowClass}">
      <td data-priority="critical" class="table__cell-domain">
        ${domainDisplay}
      </td>
      <td data-priority="critical" class="table__cell-target">
        ${targetDisplay}
      </td>
      <td data-priority="medium" class="table__cell-activity">
        ${activityDisplay}
      </td>
      <td data-priority="high" class="table__cell-status">
        ${statusDisplay}
      </td>
      <td data-priority="critical" class="table__cell-actions">
        <div class="table-actions table-actions--inline">
          ${actions}
        </div>
      </td>
      <td data-priority="critical" class="table__cell-checkbox">
        ${checkbox}
      </td>
    </tr>
  `;
}

/**
 * Update global select-all checkbox state
 * Note: Paused/archived sites are excluded from selection count
 */
function updateGlobalCheckbox(): void {
  const globalCheckbox = document.querySelector('[data-select-all-global]') as HTMLInputElement;
  if (!globalCheckbox) return;

  // Exclude primary domains and paused/archived sites
  const selectableDomains = filteredRedirects.filter(r =>
    !primaryDomains.has(r.domain) &&
    r.site_status !== 'paused' &&
    r.site_status !== 'archived'
  );
  const selectedCount = selectableDomains.filter(r => selectedRedirects.has(r.id)).length;

  if (selectedCount === 0) {
    globalCheckbox.checked = false;
    globalCheckbox.indeterminate = false;
  } else if (selectedCount === selectableDomains.length) {
    globalCheckbox.checked = true;
    globalCheckbox.indeterminate = false;
  } else {
    globalCheckbox.checked = false;
    globalCheckbox.indeterminate = true;
  }
}

/**
 * Get domain display with status
 * For primary domains, show flag badge after domain name
 * For child rows (level-2), add indentation via CSS class
 */
function getDomainDisplay(
  redirect: DomainRedirect,
  isPrimaryDomain: boolean,
  isTopLevel: boolean = false,
  allDonorsSelected: boolean = false,
  someDonorsSelected: boolean = false,
  redirectCountBadge: string = ''
): string {
  const statusBadge = redirect.domain_status !== 'active'
    ? `<span class="badge badge--xs badge--${redirect.domain_status === 'parked' ? 'neutral' : 'danger'}">${redirect.domain_status}</span>`
    : '';

  // Flag and tag badges for primary domains (sites) - shown after domain name
  let flagBadge = '';
  if (isPrimaryDomain) {
    const parts: string[] = [];
    if (redirect.site_flag) {
      parts.push(redirect.site_flag);
    }
    if (redirect.site_tag) {
      parts.push(redirect.site_tag);
    }
    if (parts.length > 0) {
      flagBadge = `<span class="badge badge--sm badge--neutral">${parts.join(' ')}</span>`;
    }
  }

  // Mass-select checkbox or pause icon for primary domains
  let checkboxBefore = '';
  if (isPrimaryDomain) {
    const isPaused = redirect.site_status === 'paused' || redirect.site_status === 'archived';
    if (isPaused) {
      // Show pause icon instead of checkbox for paused/archived sites
      checkboxBefore = `
        <span
          class="icon icon--sm text-warning"
          data-icon="mono/pause"
          title="Site is ${redirect.site_status} — excluded from bulk actions"
        ></span>
      `;
    } else {
      checkboxBefore = `
        <input
          type="checkbox"
          class="checkbox"
          data-select-site-domains="${redirect.site_id}"
          ${allDonorsSelected ? 'checked' : ''}
          ${someDonorsSelected ? 'data-indeterminate="true"' : ''}
          aria-label="Select all domains of ${redirect.domain}"
        />
      `;
    }
  }

  // Donor domains (redirect sources) - show colored unicode arrow AFTER domain
  let iconAfter = '';

  if (!isPrimaryDomain && redirect.target_url) {
    const { color: arrowColor, title: arrowTitle } = getArrowStyle(redirect);
    iconAfter = `<span class="${arrowColor}" style="font-size: 1.125rem; line-height: 1;" title="${arrowTitle}">→</span>`;
  }

  return `
    <div class="table-cell-stack ${!isTopLevel ? 'table-cell-stack--child' : ''}">
      ${checkboxBefore}
      <span class="table-cell-main">${redirect.domain}</span>
      ${flagBadge}
      ${redirectCountBadge}
      ${statusBadge}
      ${iconAfter}
    </div>
  `;
}

/**
 * Get target display
 * Format: [badge] for primary, → target [code] for redirects, or "No redirect"
 * - Primary domains: just [Landing/TDS/Hybrid] badge (no domain duplicate)
 * - Redirects: → target [301/302]
 * - No redirect: "No redirect"
 */
function getTargetDisplay(redirect: DomainRedirect, isPrimaryDomain: boolean): string {
  // Primary domains (sites) → show only site type badge (no domain duplicate)
  if (isPrimaryDomain && !redirect.target_url) {
    const siteTypeBadges = {
      landing: `<span class="badge badge--sm badge--success">Landing</span>`,
      tds: `<span class="badge badge--sm badge--brand">TDS</span>`,
      hybrid: `<span class="badge badge--sm badge--warning">Hybrid</span>`,
    };
    return siteTypeBadges[redirect.site_type as keyof typeof siteTypeBadges] || '<span class="text-muted">—</span>';
  }

  // No redirect configured → show "+ Add" quick action on hover
  if (!redirect.target_url) {
    return `
      <div class="table-cell-empty-state">
        <span class="text-muted">No redirect</span>
        <button
          class="btn-link btn-link--sm table-cell-quick-action"
          type="button"
          data-action="add-redirect"
          data-redirect-id="${redirect.id}"
          title="Add redirect"
        >
          <span class="icon" data-icon="mono/plus"></span>
          <span>Add</span>
        </button>
      </div>
    `;
  }

  // Redirect configured → show target domain (no arrow, since source domain already has →)
  const targetHost = redirect.target_url.replace('https://', '').replace('http://', '').split('/')[0];

  return `
    <div class="table-cell-inline">
      <span class="table-cell-main" title="${redirect.target_url}">${targetHost}</span>
    </div>
  `;
}

/**
 * Get activity display (analytics data from CF GraphQL Analytics API)
 *
 * Analytics available via httpRequestsAdaptiveGroups dataset (Free plan included)
 * Data shows 3xx redirect hits (301/302/307/308) aggregated from CF edge logs
 *
 * Logic:
 * - Has analytics data → show clicks count + trend icon
 * - No analytics data → empty cell (clean UI, no visual noise)
 */
function getActivityDisplay(redirect: DomainRedirect): string {
  // No analytics data - show empty cell
  if (!redirect.analytics) {
    return '';
  }

  // Has analytics data - show clicks + trend
  const { clicks_7d, trend } = redirect.analytics;

  // Format clicks count (e.g., 1847 -> 1.8K, 12847 -> 12.8K)
  const formatClicks = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Trend symbol and color
  const trendSymbols = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };
  const trendClasses = {
    up: 'text-ok',
    down: 'text-warning',
    neutral: 'text-muted',
  };

  const symbol = trendSymbols[trend] || '';
  const colorClass = trendClasses[trend] || 'text-muted';
  const clicksFormatted = formatClicks(clicks_7d);

  return `<span class="text-sm ${colorClass}">${symbol} ${clicksFormatted}</span>`;
}

/**
 * Escape HTML for safe use in attributes
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get status display (per truth table spec)
 *
 * Acceptor domain (role='acceptor'):
 * - Shows "Target" - this is the destination site, not a redirect
 *
 * Donor domain (has_redirect=true):
 * - Active (sync_status=synced) - redirect is working
 * - Pending (sync_status=pending) - sync in progress
 * - Error (sync_status=error) - sync failed
 * - New (sync_status=never) - not synced yet
 * - Disabled (enabled=false) - redirect disabled by user
 */
function getStatusDisplay(redirect: DomainRedirect): string {
  // Acceptor domain (target site)
  if (redirect.role === 'acceptor') {
    // Check if acceptor has redirect configured (problematic state)
    if (redirect.has_redirect && redirect.target_url) {
      const targetHost = redirect.target_url.replace('https://', '').replace('http://', '').split('/')[0];
      const tooltipContent = `
        <div class="tooltip tooltip--danger">
          <div class="tooltip__header">Misconfigured Primary</div>
          <div class="tooltip__body">This domain redirects to ${targetHost}</div>
          <div class="tooltip__footer">Use "Clear primary redirect" to fix</div>
        </div>
      `.trim();
      return `<span class="badge badge--danger" data-tooltip data-tooltip-content="${escapeHtml(tooltipContent)}">Alert</span>`;
    }
    return '<span class="badge badge--brand" title="Redirect target (main site domain)">Target</span>';
  }

  // Donor domain without redirect configured - should not happen in normal flow
  if (!redirect.has_redirect) {
    if (!redirect.enabled) {
      return '<span class="badge badge--neutral" title="Disabled by user">Disabled</span>';
    }
    // Enabled but no redirect configured - edge case
    return '<span class="badge badge--neutral" title="No redirect configured">Enabled</span>';
  }

  // Case 2: Redirect configured but disabled (has_redirect=true, enabled=false)
  if (!redirect.enabled) {
    return '<span class="badge badge--neutral" title="Disabled by user">Disabled</span>';
  }

  // Case 3: Redirect configured and enabled (has_redirect=true, enabled=true)
  // Show status based on sync_status
  if (redirect.sync_status === 'synced') {
    const syncDate = redirect.last_sync_at ? formatTooltipTimestamp(redirect.last_sync_at) : 'Unknown';
    const tooltipContent = `
      <div class="tooltip tooltip--success">
        <div class="tooltip__header">Synced to CDN</div>
        <div class="tooltip__body">Last sync: ${syncDate}</div>
      </div>
    `.trim();
    return `<span class="badge badge--success" data-tooltip data-tooltip-content="${escapeHtml(tooltipContent)}">Active</span>`;
  }

  if (redirect.sync_status === 'pending') {
    return '<span class="badge badge--warning" title="Sync in progress">Pending</span>';
  }

  if (redirect.sync_status === 'error') {
    const errorMessage = redirect.sync_error || 'Unknown error';
    const lastAttempt = redirect.last_sync_at ? formatTooltipTimestamp(redirect.last_sync_at) : 'Unknown';
    const tooltipContent = `
      <div class="tooltip tooltip--danger">
        <div class="tooltip__header">Sync Failed</div>
        <div class="tooltip__body">${errorMessage}</div>
        <div class="tooltip__footer">Last attempt: ${lastAttempt}</div>
      </div>
    `.trim();
    return `<span class="badge badge--danger" data-tooltip data-tooltip-content="${escapeHtml(tooltipContent)}">Error</span>`;
  }

  if (redirect.sync_status === 'never') {
    return '<span class="badge badge--neutral" title="Not synced yet">New</span>';
  }

  return '<span class="badge badge--neutral" title="Unknown status">Unknown</span>';
}

/**
 * Get row actions (per truth table spec)
 *
 * - Edit: always available
 * - Retry sync: available if has_redirect=true AND enabled=true AND sync_status in ('error', 'never')
 * - Sync now: available if has_redirect=true AND enabled=true AND sync_status != 'pending'
 * - Enable/Disable: available for donor domains (not primary)
 * - Delete: available for donor domains
 */
function getRowActions(redirect: DomainRedirect): string {
  const isPrimaryDomain = primaryDomains.has(redirect.domain);

  // Edit button (always present)
  const editButton = `
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit" data-redirect-id="${redirect.id}" title="Edit redirect">
      <span class="icon" data-icon="mono/pencil-circle"></span>
    </button>
  `;

  // Primary domains: only Edit (no enable/disable)
  if (isPrimaryDomain) {
    return editButton;
  }

  // Donor domains without redirect: show "Add redirect" option
  if (!redirect.has_redirect) {
    const kebabMenu = `
      <div class="dropdown" data-dropdown>
        <button class="btn-icon btn-icon--sm btn-icon--ghost dropdown__trigger" type="button" aria-haspopup="menu" title="More actions">
          <span class="icon" data-icon="mono/dots-vertical"></span>
        </button>
        <div class="dropdown__menu" role="menu">
          <button class="dropdown__item" type="button" data-action="add-redirect" data-redirect-id="${redirect.domain_id}">
            <span class="icon" data-icon="mono/plus"></span>
            <span>Add redirect</span>
          </button>
        </div>
      </div>
    `;
    return `${editButton} ${kebabMenu}`;
  }

  // Kebab menu for donor domains WITH redirect
  const isDisabled = !redirect.enabled;
  const toggleLabel = isDisabled ? 'Enable' : 'Disable';
  const toggleAction = isDisabled ? 'enable' : 'disable';

  // Retry sync: only for error and never states (when enabled)
  const canRetrySync = redirect.enabled &&
    (redirect.sync_status === 'error' || redirect.sync_status === 'never');
  const retryOption = canRetrySync ? `
    <button class="dropdown__item" type="button" data-action="retry-sync" data-redirect-id="${redirect.id}">
      <span class="icon" data-icon="mono/refresh"></span>
      <span>Retry sync</span>
    </button>
  ` : '';

  // Sync now: available when enabled and not currently pending
  const canSyncNow = redirect.enabled && redirect.sync_status !== 'pending';
  const syncNowOption = canSyncNow ? `
    <button class="dropdown__item" type="button" data-action="sync-now" data-redirect-id="${redirect.id}">
      <span class="icon" data-icon="brand/cloudflare"></span>
      <span>Sync now</span>
    </button>
  ` : '';

  // Build sync actions (only show divider if there are sync actions)
  const syncActions = retryOption || syncNowOption;
  const syncSection = syncActions ? `
    ${syncNowOption}
    ${retryOption}
    <div class="dropdown__divider"></div>
  ` : '';

  const kebabMenu = `
    <div class="dropdown" data-dropdown>
      <button class="btn-icon btn-icon--sm btn-icon--ghost dropdown__trigger" type="button" aria-haspopup="menu" title="More actions">
        <span class="icon" data-icon="mono/dots-vertical"></span>
      </button>
      <div class="dropdown__menu" role="menu">
        <button class="dropdown__item" type="button" data-action="${toggleAction}" data-redirect-id="${redirect.id}">
          <span class="icon" data-icon="mono/${isDisabled ? 'play' : 'pause'}"></span>
          <span>${toggleLabel}</span>
        </button>
        ${syncSection}
        <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete" data-redirect-id="${redirect.id}">
          <span class="icon" data-icon="mono/delete"></span>
          <span>Delete</span>
        </button>
      </div>
    </div>
  `;

  return `${editButton} ${kebabMenu}`;
}

/**
 * Get actions for site header row (primary domain row)
 * Two icons: Edit Site + Kebab with site-level actions
 * @param acceptorHasRedirect - true if acceptor has its own redirect (problematic state)
 */
function getSiteHeaderActions(redirect: DomainRedirect, acceptorHasRedirect: boolean = false): string {
  // Edit Site button (opens drawer with site info)
  const editButton = `
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit-site" data-site-id="${redirect.site_id}" data-redirect-id="${redirect.id}" title="Edit site">
      <span class="icon" data-icon="mono/pencil-circle"></span>
    </button>
  `;

  // Clear primary redirect action (only if acceptor has redirect configured)
  const clearPrimaryRedirectAction = acceptorHasRedirect ? `
    <button class="dropdown__item dropdown__item--warning" type="button" data-action="clear-primary-redirect" data-redirect-id="${redirect.id}" data-domain-id="${redirect.domain_id}">
      <span class="icon" data-icon="mono/close-circle"></span>
      <span>Clear primary redirect</span>
    </button>
    <div class="dropdown__divider"></div>
  ` : '';

  // Kebab menu with site-level actions
  const kebabMenu = `
    <div class="dropdown" data-dropdown>
      <button class="btn-icon btn-icon--sm btn-icon--ghost dropdown__trigger" type="button" aria-haspopup="menu" title="Site actions">
        <span class="icon" data-icon="mono/dots-vertical"></span>
      </button>
      <div class="dropdown__menu" role="menu">
        ${clearPrimaryRedirectAction}
        <button class="dropdown__item" type="button" data-action="manage-domains" data-site-id="${redirect.site_id}">
          <span class="icon" data-icon="mono/web"></span>
          <span>Manage domains</span>
        </button>
        <div class="dropdown__divider"></div>
        <button class="dropdown__item" type="button" data-action="apply-t4" data-site-id="${redirect.site_id}">
          <span class="icon" data-icon="mono/directions-fork"></span>
          <span>Apply: www → apex</span>
        </button>
        <button class="dropdown__item" type="button" data-action="apply-t3" data-site-id="${redirect.site_id}">
          <span class="icon" data-icon="mono/directions-fork"></span>
          <span>Apply: apex → www</span>
        </button>
        <div class="dropdown__divider"></div>
        <button class="dropdown__item dropdown__item--danger" type="button" data-action="clear-site-redirects" data-site-id="${redirect.site_id}">
          <span class="icon" data-icon="mono/delete"></span>
          <span>Clear site redirects</span>
        </button>
      </div>
    </div>
  `;

  return `${editButton} ${kebabMenu}`;
}

/**
 * Setup search
 */
function setupSearch(): void {
  const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
  const searchClear = document.querySelector('[data-search-clear]') as HTMLButtonElement;
  const tableSearch = document.querySelector('[data-table-search]') as HTMLElement;

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase().trim();

    if (!query) {
      filteredRedirects = [...currentRedirects];
    } else {
      filteredRedirects = currentRedirects.filter(redirect =>
        redirect.domain.toLowerCase().includes(query) ||
        (redirect.target_url && redirect.target_url.toLowerCase().includes(query)) ||
        redirect.site_name.toLowerCase().includes(query) ||
        redirect.project_name.toLowerCase().includes(query)
      );
    }

    // Toggle clear button visibility
    if (tableSearch) {
      if (query.length > 0) {
        tableSearch.classList.add('table-search--active');
      } else {
        tableSearch.classList.remove('table-search--active');
      }
    }

    renderTable();
  });

  // Clear button handler
  if (searchClear && searchInput && tableSearch) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      filteredRedirects = [...currentRedirects];
      renderTable();
      tableSearch.classList.remove('table-search--active');
      searchInput.focus();
    });
  }
}

/**
 * Setup filters
 */
function setupFilters(): void {
  const filterBar = document.querySelector('[data-filter-bar]');
  if (!filterBar) return;

  // Reset filters button state updater
  const resetBtn = document.querySelector('[data-reset-filters]');
  const updateResetButton = () => {
    if (resetBtn) {
      if (hasActiveFilters(activeFilters)) {
        resetBtn.classList.add('is-active');
      } else {
        resetBtn.classList.remove('is-active');
      }
    }
  };

  // Handler for filter changes (re-renders filter bar HTML only)
  const handleFilterChange = (updatedFilters: ActiveFilters) => {
    activeFilters = updatedFilters;
    applyFilters();
    // Re-render filter bar HTML to update UI (checkmarks, count badge, clear button)
    filterBar.innerHTML = renderFilterBar(activeFilters);
    updateResetButton();
  };

  // Initial render
  filterBar.innerHTML = renderFilterBar(activeFilters);

  // Initialize filter UI once (event listeners use delegation, so they work after re-renders)
  initFilterUI(filterBar as HTMLElement, activeFilters, handleFilterChange);

  // Reset filters button handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeFilters = getDefaultFilters();
      handleFilterChange(activeFilters);
    });
  }

  // Initial state
  updateResetButton();
}

/**
 * Apply filters
 * Note: Project/Site filtering is handled by selectors, not here
 */
function applyFilters(): void {
  let result = [...currentRedirects];

  // Apply configured filter (multi-select)
  if (activeFilters.configured && activeFilters.configured.length > 0) {
    result = result.filter(r => {
      const hasRedirect = r.has_redirect;
      if (activeFilters.configured!.includes('has-redirect') && hasRedirect) return true;
      if (activeFilters.configured!.includes('no-redirect') && !hasRedirect) return true;
      return false;
    });
  }

  // Apply sync filter (multi-select)
  if (activeFilters.sync && activeFilters.sync.length > 0) {
    result = result.filter(r => activeFilters.sync!.includes(r.sync_status));
  }

  // Apply enabled filter (multi-select)
  if (activeFilters.enabled && activeFilters.enabled.length > 0) {
    result = result.filter(r => {
      const enabled = r.enabled;
      if (activeFilters.enabled!.includes('enabled') && enabled) return true;
      if (activeFilters.enabled!.includes('disabled') && !enabled) return true;
      return false;
    });
  }

  filteredRedirects = result;
  renderTable();
  updateBulkActionsBar();
}

/**
 * Setup action buttons
 */
function setupActions(): void {
  const card = document.querySelector('[data-redirects-card]');
  if (!card) return;

  // Handle header "Add Redirects" button (outside of card)
  const addRedirectsBtn = document.querySelector('[data-action="add-redirects"]');
  if (addRedirectsBtn) {
    addRedirectsBtn.addEventListener('click', () => {
      handleAddRedirects();
    });
  }

  // Delegate events for action buttons inside card
  card.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    if (!button) return;

    const action = button.dataset.action;
    const redirectId = button.dataset.redirectId ? Number(button.dataset.redirectId) : null;
    const groupId = button.dataset.groupId ? Number(button.dataset.groupId) : null;
    const siteId = button.dataset.siteId ? Number(button.dataset.siteId) : null;
    const domainId = button.dataset.domainId ? Number(button.dataset.domainId) : null;

    switch (action) {
      case 'toggle-group':
        if (groupId !== null) handleToggleGroup(groupId);
        break;
      case 'edit':
        if (redirectId) handleEdit(redirectId);
        break;
      case 'edit-site':
        if (redirectId) handleEditSite(redirectId);
        break;
      case 'manage-domains':
        if (siteId) handleManageDomains(siteId);
        break;
      case 'apply-t3':
        if (siteId) handleApplyTemplate(siteId, 't3');
        break;
      case 'apply-t4':
        if (siteId) handleApplyTemplate(siteId, 't4');
        break;
      case 'clear-site-redirects':
        if (siteId) handleClearSiteRedirects(siteId);
        break;
      case 'clear-primary-redirect':
        if (redirectId && domainId) handleClearPrimaryRedirect(redirectId, domainId);
        break;
      case 'enable':
        if (redirectId) handleEnable(redirectId);
        break;
      case 'disable':
        if (redirectId) handleDisable(redirectId);
        break;
      case 'retry-sync':
        if (redirectId) handleRetrySync(redirectId);
        break;
      case 'sync-now':
        if (redirectId) handleSyncNow(redirectId);
        break;
      case 'delete':
        if (redirectId) handleDelete(redirectId);
        break;
      case 'add-redirect':
        if (redirectId) handleAddRedirect(redirectId);
        break;
      case 'add-redirects':
        handleAddRedirects();
        break;
      case 'retry':
        loadRedirects();
        break;
    }
  });

  // Delegate events for checkboxes
  card.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;

    // Individual checkbox
    if (target.hasAttribute('data-redirect-checkbox')) {
      const checkbox = target as HTMLInputElement;
      const redirectId = Number(checkbox.dataset.redirectId);
      if (checkbox.checked) {
        selectedRedirects.add(redirectId);
      } else {
        selectedRedirects.delete(redirectId);
      }
      renderTable();
      updateBulkActionsBar();
    }

    // Site mass-select checkbox (select all donor domains of this site)
    if (target.hasAttribute('data-select-site-domains')) {
      const checkbox = target as HTMLInputElement;
      const siteId = Number(checkbox.dataset.selectSiteDomains);
      handleSelectSiteDomains(siteId, checkbox.checked);
    }

    // Global select-all checkbox
    if (target.hasAttribute('data-select-all-global')) {
      const checkbox = target as HTMLInputElement;
      handleSelectAllGlobal(checkbox.checked);
    }
  });

  // Setup bulk actions
  setupBulkActions();
}

/**
 * Setup bulk actions handlers
 */
function setupBulkActions(): void {
  const bulkBar = document.querySelector('[data-bulk-actions]');
  if (!bulkBar) return;

  bulkBar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    if (!button) return;

    const action = button.dataset.action;

    switch (action) {
      case 'clear-selection':
        handleClearSelection();
        break;
      case 'bulk-sync':
        handleBulkSync();
        break;
      case 'bulk-enable':
        handleBulkEnable();
        break;
      case 'bulk-disable':
        handleBulkDisable();
        break;
      case 'bulk-delete':
        handleBulkDelete();
        break;
    }
  });

  // Handle bulk delete confirmation
  const confirmBulkDeleteBtn = document.querySelector('[data-confirm-bulk-delete]');
  confirmBulkDeleteBtn?.addEventListener('click', async () => {
    const count = selectedRedirects.size;
    if (count === 0) {
      hideDialog('bulk-delete-redirects');
      return;
    }

    // Collect redirect and domain IDs
    const toDelete: { redirectId: number; domainId: number }[] = [];
    for (const redirectId of selectedRedirects) {
      const redirect = currentRedirects.find(r => r.id === redirectId);
      if (redirect) {
        toDelete.push({ redirectId, domainId: redirect.domain_id });
      }
    }

    // Close dialog immediately for better UX
    hideDialog('bulk-delete-redirects');

    try {
      // Optimistic updates
      for (const { domainId } of toDelete) {
        removeRedirectFromDomain(domainId);
      }
      renderTable();
      handleClearSelection();

      // API calls (parallel)
      await Promise.all(
        toDelete.map(({ redirectId }) => deleteRedirect(redirectId))
      );

      showGlobalNotice('success', `Deleted ${toDelete.length} redirect(s)`);
    } catch (error: any) {
      // On error, refresh to restore state
      await refreshRedirects();
      showGlobalNotice('error', error.message || 'Failed to delete redirects');
    }
  });

  // Handle single delete confirmation
  const confirmDeleteBtn = document.querySelector('[data-confirm-delete]');
  confirmDeleteBtn?.addEventListener('click', () => {
    confirmDeleteRedirect();
  });
}

/**
 * Handle toggle group collapse/expand
 */
function handleToggleGroup(groupId: number): void {
  if (collapsedGroups.has(groupId)) {
    collapsedGroups.delete(groupId);
  } else {
    collapsedGroups.add(groupId);
  }
  renderTable();
}

/**
 * Handle edit redirect
 */
function handleEdit(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  openDrawer(redirect);
}

/**
 * Handle edit site (opens drawer with site info)
 */
function handleEditSite(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  // Open drawer showing site/acceptor info
  openDrawer(redirect);
}

/**
 * Handle manage domains - redirect to domains page with site filter
 */
function handleManageDomains(siteId: number): void {
  // Open manage site domains drawer
  openManageSiteDomainsDrawer(siteId);
}

/**
 * Handle apply template (T3 = apex→www, T4 = www→apex)
 */
async function handleApplyTemplate(siteId: number, template: 't3' | 't4'): Promise<void> {
  const siteDomains = currentRedirects.filter(r => r.site_id === siteId);
  const site = siteDomains[0];
  if (!site) return;

  const templateName = template === 't3' ? 'apex → www' : 'www → apex';

  // TODO: Implement API call to apply template
  // This will set up redirects for all domains in the site based on the template:
  // T3: non-www domains redirect to www variant
  // T4: www domains redirect to apex variant
  showGlobalNotice('info', `Template "${templateName}" will be applied to ${site.site_name}`);
}

/**
 * Handle clear site redirects - removes all redirect configurations for the site
 */
async function handleClearSiteRedirects(siteId: number): Promise<void> {
  const siteDomains = currentRedirects.filter(r => r.site_id === siteId);
  const site = siteDomains[0];
  if (!site) return;

  const donorDomains = siteDomains.filter(d => d.has_redirect && !primaryDomains.has(d.domain));

  if (donorDomains.length === 0) {
    showGlobalNotice('info', 'No redirects to clear for this site');
    return;
  }

  const confirmed = confirm(`Clear ${donorDomains.length} redirect(s) from "${site.site_name}"?\n\nThis will remove redirect configurations but keep the domains.`);
  if (!confirmed) return;

  // TODO: Implement API call to delete all redirects for the site
  // This would call deleteRedirect for each domain_id
  showGlobalNotice('info', `Clearing ${donorDomains.length} redirects from ${site.site_name}...`);
}

/**
 * Handle enable redirect
 */
async function handleEnable(redirectId: number): Promise<void> {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  try {
    // Optimistic update
    updateDomainRedirect(redirect.domain_id, { enabled: true });
    renderTable();

    // API call
    await updateRedirect(redirectId, { enabled: true });
    showGlobalNotice('success', `Enabled redirect for ${redirect.domain}`);
  } catch (error: any) {
    // Rollback optimistic update
    updateDomainRedirect(redirect.domain_id, { enabled: false });
    renderTable();
    showGlobalNotice('error', error.message || 'Failed to enable redirect');
  }
}

/**
 * Handle disable redirect
 */
async function handleDisable(redirectId: number): Promise<void> {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  try {
    // Optimistic update
    updateDomainRedirect(redirect.domain_id, { enabled: false });
    renderTable();

    // API call
    await updateRedirect(redirectId, { enabled: false });
    showGlobalNotice('success', `Disabled redirect for ${redirect.domain}`);
  } catch (error: any) {
    // Rollback optimistic update
    updateDomainRedirect(redirect.domain_id, { enabled: true });
    renderTable();
    showGlobalNotice('error', error.message || 'Failed to disable redirect');
  }
}

/**
 * Handle retry sync (same as sync now - triggers zone sync)
 */
async function handleRetrySync(redirectId: number): Promise<void> {
  // Retry sync is the same as sync now - it triggers zone-level sync
  await handleSyncNow(redirectId);
}

/**
 * Handle sync now - syncs the entire zone containing this redirect
 */
async function handleSyncNow(redirectId: number): Promise<void> {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  // Get zone_id from state
  const state = getState();
  const domain = state.domains.find(d => d.domain_id === redirect.domain_id);
  if (!domain?.zone_id) {
    showGlobalNotice('error', 'Domain is not associated with a Cloudflare zone');
    return;
  }

  try {
    // Mark as pending in UI
    updateDomainRedirect(redirect.domain_id, { sync_status: 'pending' });
    renderTable();

    // API call - sync entire zone
    const response = await applyZoneRedirects(domain.zone_id);

    // Update state with synced redirects
    const syncedIds = response.synced_rules?.map(r => r.id) || [];
    markZoneSynced(domain.zone_id, syncedIds);
    renderTable();

    showGlobalNotice('success', `Synced ${response.rules_applied || 1} redirect(s) to Cloudflare`);
  } catch (error: any) {
    // Mark as error
    updateDomainRedirect(redirect.domain_id, { sync_status: 'error' });
    renderTable();
    showGlobalNotice('error', error.message || 'Failed to sync to Cloudflare');
  }
}

// Pending delete redirect for confirmation dialog
let pendingDeleteRedirect: DomainRedirect | null = null;

/**
 * Handle delete redirect - shows confirmation dialog
 */
function handleDelete(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  // Store redirect for confirmation
  pendingDeleteRedirect = redirect;

  // Update dialog with domain name
  const domainEl = document.querySelector('[data-delete-domain]');
  if (domainEl) {
    domainEl.textContent = redirect.domain;
  }

  // Show confirmation dialog
  showDialog('delete-redirect');
}

/**
 * Confirm and execute delete redirect
 */
async function confirmDeleteRedirect(): Promise<void> {
  if (!pendingDeleteRedirect) return;

  const redirect = pendingDeleteRedirect;
  pendingDeleteRedirect = null;

  // Hide dialog immediately
  hideDialog('delete-redirect');

  try {
    // Optimistic update - remove from state
    removeRedirectFromDomain(redirect.domain_id);
    renderTable();

    // API call
    await deleteRedirect(redirect.id);
    showGlobalNotice('success', `Deleted redirect for ${redirect.domain}`);
  } catch (error: any) {
    // On error, refresh to restore state
    await refreshRedirects();
    showGlobalNotice('error', error.message || 'Failed to delete redirect');
  }
}

/**
 * Handle clear primary redirect (for acceptor that has redirect configured)
 * This is a problematic state after changing primary domain - acceptor shouldn't have redirect
 */
async function handleClearPrimaryRedirect(redirectId: number, domainId: number): Promise<void> {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  try {
    // Optimistic update - remove redirect but keep acceptor role
    removeRedirectFromDomain(domainId, true);
    renderTable();

    // API call
    await deleteRedirect(redirectId);
    showGlobalNotice('success', `Cleared redirect from primary domain ${redirect.domain}`);
  } catch (error: any) {
    // On error, refresh to restore state
    await refreshRedirects();
    showGlobalNotice('error', error.message || 'Failed to clear redirect');
  }
}

/**
 * Handle add redirect (for domains without redirect configured)
 */
function handleAddRedirect(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  openDrawer(redirect);
}

/**
 * Handle add redirects (bulk add - main button)
 */
function handleAddRedirects(): void {
  openBulkAddDrawer();
}

/**
 * Handle select all donor domains of a specific site
 * Note: Paused sites are excluded (checkbox disabled in UI)
 */
function handleSelectSiteDomains(siteId: number, checked: boolean): void {
  // Get all domains that belong to this site (excluding the primary domain itself)
  // Also exclude paused/archived sites from selection
  const siteDomains = filteredRedirects.filter(r =>
    r.site_id === siteId &&
    !primaryDomains.has(r.domain) &&
    r.site_status !== 'paused' &&
    r.site_status !== 'archived'
  );

  if (checked) {
    // Select all donor domains of this site
    for (const redirect of siteDomains) {
      selectedRedirects.add(redirect.id);
    }
  } else {
    // Deselect all donor domains of this site
    for (const redirect of siteDomains) {
      selectedRedirects.delete(redirect.id);
    }
  }

  renderTable();
  updateBulkActionsBar();
}

/**
 * Handle select all redirects globally (all donor domains, excluding primary)
 * Note: Paused/archived sites are excluded from selection
 */
function handleSelectAllGlobal(checked: boolean): void {
  // Exclude primary domains and paused/archived sites
  const selectableDomains = filteredRedirects.filter(r =>
    !primaryDomains.has(r.domain) &&
    r.site_status !== 'paused' &&
    r.site_status !== 'archived'
  );

  if (checked) {
    // Select all selectable domains
    for (const redirect of selectableDomains) {
      selectedRedirects.add(redirect.id);
    }
  } else {
    // Deselect all domains
    selectedRedirects.clear();
  }

  renderTable();
  updateBulkActionsBar();
}

/**
 * Handle clear selection
 */
function handleClearSelection(): void {
  selectedRedirects.clear();
  renderTable();
  updateBulkActionsBar();
}

/**
 * Update bulk actions bar visibility and count using shared utility
 */
function updateBulkActionsBar(): void {
  const count = selectedRedirects.size;
  updateBulkActions(count, {
    bulkBarSelector: '[data-bulk-actions]',
    countSelector: '[data-selected-count]',
  });
}

/**
 * Handle bulk sync to Cloudflare
 * Groups selected redirects by zone and syncs each zone
 */
async function handleBulkSync(): Promise<void> {
  const count = selectedRedirects.size;
  if (count === 0) return;

  // Collect zones from ALL selected redirects
  // - Enabled redirects will be applied to CF
  // - Disabled redirects will be removed from CF (not in ruleset)
  const state = getState();
  const zoneIds = new Set<number>();
  const enabledDomainIds: number[] = [];
  const disabledDomainIds: number[] = [];

  for (const redirectId of selectedRedirects) {
    const legacyRedirect = currentRedirects.find(r => r.id === redirectId);
    if (legacyRedirect) {
      const domain = state.domains.find(d => d.domain_id === legacyRedirect.domain_id);
      if (domain?.zone_id) {
        zoneIds.add(domain.zone_id);
        if (legacyRedirect.enabled) {
          enabledDomainIds.push(domain.domain_id);
        } else {
          disabledDomainIds.push(domain.domain_id);
        }
      }
    }
  }

  if (zoneIds.size === 0) {
    showGlobalNotice('error', 'Selected domains are not associated with Cloudflare zones');
    return;
  }

  try {
    // Mark enabled as pending (they will be synced)
    for (const domainId of enabledDomainIds) {
      updateDomainRedirect(domainId, { sync_status: 'pending' });
    }
    renderTable();

    // Sync each zone (applies enabled, removes disabled from CF)
    let totalSynced = 0;
    for (const zoneId of zoneIds) {
      const response = await applyZoneRedirects(zoneId);
      const syncedIds = response.synced_rules?.map(r => r.id) || [];
      markZoneSynced(zoneId, syncedIds);
      totalSynced += response.rules_applied || 0;
    }

    renderTable();

    // Build result message
    const parts: string[] = [];
    if (enabledDomainIds.length > 0) {
      parts.push(`${totalSynced} applied`);
    }
    if (disabledDomainIds.length > 0) {
      parts.push(`${disabledDomainIds.length} removed`);
    }
    showGlobalNotice('success', `Synced ${zoneIds.size} zone(s): ${parts.join(', ')}`);
    handleClearSelection();
  } catch (error: any) {
    // On error, refresh to get actual state
    await refreshRedirects();
    showGlobalNotice('error', error.message || 'Failed to sync to Cloudflare');
  }
}

/**
 * Handle bulk enable
 */
async function handleBulkEnable(): Promise<void> {
  const count = selectedRedirects.size;
  if (count === 0) return;

  // Collect domain IDs for optimistic update
  const domainIds: number[] = [];
  const redirectIds: number[] = [];
  for (const redirectId of selectedRedirects) {
    const redirect = currentRedirects.find(r => r.id === redirectId);
    if (redirect && !redirect.enabled) {
      domainIds.push(redirect.domain_id);
      redirectIds.push(redirectId);
    }
  }

  if (redirectIds.length === 0) {
    showGlobalNotice('info', 'All selected redirects are already enabled');
    return;
  }

  try {
    // Optimistic update
    bulkUpdateEnabled(domainIds, true);
    renderTable();

    // API calls (parallel)
    await Promise.all(
      redirectIds.map(id => updateRedirect(id, { enabled: true }))
    );

    showGlobalNotice('success', `Enabled ${redirectIds.length} redirect(s)`);
    handleClearSelection();
  } catch (error: any) {
    // Rollback
    bulkUpdateEnabled(domainIds, false);
    renderTable();
    showGlobalNotice('error', error.message || 'Failed to enable redirects');
  }
}

/**
 * Handle bulk disable
 */
async function handleBulkDisable(): Promise<void> {
  const count = selectedRedirects.size;
  if (count === 0) return;

  // Collect domain IDs for optimistic update
  const domainIds: number[] = [];
  const redirectIds: number[] = [];
  for (const redirectId of selectedRedirects) {
    const redirect = currentRedirects.find(r => r.id === redirectId);
    if (redirect && redirect.enabled) {
      domainIds.push(redirect.domain_id);
      redirectIds.push(redirectId);
    }
  }

  if (redirectIds.length === 0) {
    showGlobalNotice('info', 'All selected redirects are already disabled');
    return;
  }

  try {
    // Optimistic update
    bulkUpdateEnabled(domainIds, false);
    renderTable();

    // API calls (parallel)
    await Promise.all(
      redirectIds.map(id => updateRedirect(id, { enabled: false }))
    );

    showGlobalNotice('success', `Disabled ${redirectIds.length} redirect(s)`);
    handleClearSelection();
  } catch (error: any) {
    // Rollback
    bulkUpdateEnabled(domainIds, true);
    renderTable();
    showGlobalNotice('error', error.message || 'Failed to disable redirects');
  }
}

/**
 * Handle bulk delete
 */
function handleBulkDelete(): void {
  const count = selectedRedirects.size;
  if (count === 0) return;

  // Update count in dialog
  const countElement = document.querySelector('[data-bulk-delete-count]');
  if (countElement) {
    countElement.textContent = count.toString();
  }

  // Show confirmation dialog
  showDialog('bulk-delete-redirects');
}
