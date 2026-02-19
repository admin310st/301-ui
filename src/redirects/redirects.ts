/**
 * Redirects page UI logic
 *
 * Simple 301/302 domain redirects management
 * NOT to be confused with Streams/TDS (complex conditional routing)
 *
 * Works with real API via state.ts (multi-site support)
 */

import type { ExtendedRedirectDomain } from './state';
import { getDefaultFilters, hasActiveFilters, type ActiveFilters } from './filters-config';
import { renderFilterBar, initFilterUI } from './filters-ui';
import { initDrawer, openDrawer } from './drawer';
import { openManageSiteDomainsDrawer } from '@domains/site-domains';
import { showDialog, hideDialog, showConfirmDialog } from '@ui/dialog';
import { formatTooltipTimestamp, initTooltips } from '@ui/tooltip';
import { initSyncStatus } from './sync-status';
import { updateBulkActionsBar as updateBulkActions } from '@ui/bulk-actions';
import { getTargetUrl } from './helpers';

// API integration
import {
  onStateChange,
  refreshRedirects,
  updateDomainRedirect,
  removeRedirectFromDomain,
  bulkUpdateEnabled,
  markZoneSynced,
  getSortedDomains,
  type SiteContext,
} from './state';
import { initSiteSelector, getAvailableProjects, getAvailableSites } from './site-selector';
import {
  updateRedirect,
  deleteRedirect,
  applyZoneRedirects,
} from '@api/redirects';
import { safeCall } from '@api/ui-client';
import { showGlobalNotice } from '@ui/globalNotice';

let currentRedirects: ExtendedRedirectDomain[] = [];
let filteredRedirects: ExtendedRedirectDomain[] = [];
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
      showEmptyState('no-domains');
    } else if (state.domains.length > 0) {
      // Domains are already sorted and extended with site context
      currentRedirects = getSortedDomains();
      filteredRedirects = [...currentRedirects];
      primaryDomains = calculatePrimaryDomains(currentRedirects);
      hideLoadingState();
      renderTable();
      initSyncStatus(currentRedirects);
    } else if (state.selectedSiteIds.length === 0) {
      // Determine why no sites are selected
      const projects = getAvailableProjects();
      const sites = getAvailableSites();
      if (projects.length === 0) {
        showEmptyState('no-projects');
      } else if (sites.length === 0) {
        showEmptyState('no-sites');
      } else {
        showEmptyState('no-selection');
      }
    }
  });

  // Initialize project & site selectors (triggers data load on selection)
  void initSiteSelector((_sites: SiteContext[]) => {
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
 * Show empty state with contextual message
 */
type EmptyReason = 'no-projects' | 'no-sites' | 'no-selection' | 'no-domains';

function showEmptyState(reason: EmptyReason): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const tableShell = document.querySelector('[data-table-shell]');

  if (loadingState) loadingState.hidden = true;
  if (emptyState) {
    emptyState.hidden = false;
    emptyState.innerHTML = renderEmptyContent(reason);
  }
  if (tableShell) tableShell.hidden = true;
}

function renderEmptyContent(reason: EmptyReason): string {
  switch (reason) {
    case 'no-projects':
      return `
        <div class="stack-md">
          <span class="icon icon--lg text-muted" data-icon="mono/project"></span>
          <h3 class="h4">No projects yet</h3>
          <p class="text-muted">Create a project to organize your domains and set up redirects.</p>
          <div class="card__actions">
            <a class="btn btn--primary" href="/projects.html">
              <span class="icon" data-icon="mono/plus"></span>
              <span>Create project</span>
            </a>
          </div>
        </div>`;
    case 'no-sites':
      return `
        <div class="stack-md">
          <span class="icon icon--lg text-muted" data-icon="mono/landing"></span>
          <h3 class="h4">No sites in this project</h3>
          <p class="text-muted">Create a site to attach domains and configure redirects.</p>
          <div class="card__actions">
            <a class="btn btn--primary" href="/sites.html">
              <span class="icon" data-icon="mono/plus"></span>
              <span>Create site</span>
            </a>
          </div>
        </div>`;
    case 'no-selection':
      return `
        <div class="stack-md">
          <span class="icon icon--lg text-muted" data-icon="mono/filter"></span>
          <h3 class="h4">Select a site</h3>
          <p class="text-muted">Choose a site from the filters above to view and manage its redirects.</p>
        </div>`;
    case 'no-domains':
      return `
        <div class="stack-md">
          <span class="icon icon--lg text-muted" data-icon="mono/arrow-top-right"></span>
          <h3 class="h4">No redirects configured</h3>
          <p class="text-muted">
            Set up simple 301/302 redirects for your domains.<br>
            Useful for blocked domains, migrations, or consolidation.
          </p>
        </div>`;
  }
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
function calculatePrimaryDomains(domains: ExtendedRedirectDomain[]): Set<string> {
  const primary = new Set<string>();

  for (const domain of domains) {
    if (domain.domain_role === 'acceptor') {
      primary.add(domain.domain_name);
    }
  }

  return primary;
}

/**
 * Get arrow indicator color and title for redirect
 * - Standard redirect (to acceptor): green (301) or orange (302)
 * - Custom redirect (to different URL): pink (danger)
 */
function getArrowStyle(domain: ExtendedRedirectDomain): { color: string; title: string } {
  const targetUrl = getTargetUrl(domain.domain_name, domain.redirect);
  if (!targetUrl) {
    return { color: 'text-muted', title: 'No redirect' };
  }

  // Extract host from target URL
  const targetHost = targetUrl
    .replace('https://', '')
    .replace('http://', '')
    .split('/')[0];

  // Check if target is a primary domain (standard redirect)
  const isStandardRedirect = primaryDomains.has(targetHost);
  const statusCode = domain.redirect?.status_code ?? 301;

  if (isStandardRedirect) {
    // Standard redirect to acceptor
    const redirectType = statusCode === 301 ? 'Permanent (301)' : 'Temporary (302)';
    const color = statusCode === 301 ? 'text-ok' : 'text-warning';
    return { color, title: redirectType };
  } else {
    // Custom redirect to different URL
    const redirectType = statusCode === 301 ? 'Custom (301)' : 'Custom (302)';
    return { color: 'text-danger', title: `${redirectType} - ${targetHost}` };
  }
}

/**
 * Render redirects table as flat list (no project grouping)
 * Domains are already sorted: acceptor first, then donors, then reserve
 */
function renderTable(): void {
  const tbody = document.querySelector('[data-redirects-tbody]');
  if (!tbody) return;

  // Render flat table - domains are pre-sorted (acceptor → donors → reserve)
  const html = filteredRedirects.map((domain, index) => {
    const isPrimary = domain.domain_role === 'acceptor';
    const isLastRow = index === filteredRedirects.length - 1;

    if (isPrimary) {
      // Primary domain (acceptor/target) - site header row
      return renderPrimaryDomainRow(domain);
    } else {
      // Donor or reserve domain
      return renderDomainRow(domain, isLastRow);
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
  domain: ExtendedRedirectDomain,
  options?: {
    groupId?: number;
    donorDomains?: ExtendedRedirectDomain[];  // Pre-computed donors (grouped view)
  }
): string {
  const { groupId, donorDomains } = options || {};

  // Get donor domains: use pre-computed if provided, otherwise compute from filtered
  const siteDonors = donorDomains || filteredRedirects.filter(r =>
    r.site_id === domain.site_id && r.domain_role !== 'acceptor'
  );

  // Calculate checkbox state for mass-select
  const selectedDonors = siteDonors.filter(d => selectedRedirects.has(d.domain_id));
  const allDonorsSelected = siteDonors.length > 0 && selectedDonors.length === siteDonors.length;
  const someDonorsSelected = selectedDonors.length > 0 && selectedDonors.length < siteDonors.length;

  // Count donors with redirects for badge
  const actualRedirects = siteDonors.filter(r => r.redirect !== null);

  // After dedup, T3/T4 goes to canonical_redirect, so main redirect only reflects T1
  const acceptorTargetUrl = getTargetUrl(domain.domain_name, domain.redirect);
  const acceptorHasRedirect = domain.redirect !== null && acceptorTargetUrl;

  // Redirect badge with color coding OR red arrow if non-canonical acceptor redirect
  let redirectBadge = '';
  if (acceptorHasRedirect) {
    // Acceptor has non-canonical redirect - show red danger arrow (needs attention)
    redirectBadge = `<span class="text-danger redirect-arrow" title="Primary domain has redirect configured! Click to clear.">\u2192</span>`;
  } else if (actualRedirects.length > 0) {
    const has301 = actualRedirects.some(r => (r.redirect?.status_code ?? 301) === 301);
    const has302 = actualRedirects.some(r => r.redirect?.status_code === 302);
    const badgeColor = has301 && !has302 ? 'text-ok' : 'text-warning';

    redirectBadge = `<span class="badge badge--sm badge--neutral" title="${actualRedirects.length} domain${actualRedirects.length > 1 ? 's' : ''} redirect here">
      <span class="icon ${badgeColor}">←</span>
      <span>${actualRedirects.length}</span>
    </span>`;
  }

  // Site type badge OR redirect target if acceptor has non-canonical redirect
  let targetDisplay = '';
  if (acceptorHasRedirect) {
    // Show where the acceptor redirects to (problematic state)
    const targetHost = acceptorTargetUrl!.replace('https://', '').replace('http://', '').split('/')[0];
    targetDisplay = `<span class="text-danger" title="Primary domain redirects to ${acceptorTargetUrl}">${targetHost}</span>`;
  } else {
    targetDisplay = getSiteTypeBadge('landing');
  }

  // Canonical icon prefix for domain name
  let canonicalIcon = '';
  if (domain.canonical_redirect) {
    const cr = domain.canonical_redirect;
    canonicalIcon = getCanonicalIcon(cr.sync_status, cr.updated_at, null, cr.template_id);
  }

  // Domain display with mass-select checkbox
  const domainDisplay = getDomainDisplay(domain, true, true, allDonorsSelected, someDonorsSelected, redirectBadge, canonicalIcon);

  const activityDisplay = getActivityDisplay(domain);
  const statusDisplay = getStatusDisplay(domain);
  const actions = getSiteHeaderActions(domain, !!acceptorHasRedirect);

  // Row classes: add level-1 for grouped view, paused for paused/archived sites
  const isPaused = domain.site_status === 'paused' || domain.site_status === 'archived';
  const baseClass = groupId !== undefined
    ? 'table__primary-domain table__row--level-1'
    : 'table__primary-domain';
  const rowClass = isPaused ? `${baseClass} table__row--paused` : baseClass;

  // Group ID attribute for grouped view
  const groupAttr = groupId !== undefined ? `data-group-id="${groupId}"` : '';

  return `
    <tr data-domain-id="${domain.domain_id}" ${groupAttr} data-site-id="${domain.site_id}" class="${rowClass}">
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
function renderDomainRow(domain: ExtendedRedirectDomain, _isLastRow: boolean): string {
  const isSelected = selectedRedirects.has(domain.domain_id);
  const isPaused = domain.site_status === 'paused' || domain.site_status === 'archived';

  // Arrow indicator for donors with redirect
  const targetUrl = getTargetUrl(domain.domain_name, domain.redirect);
  let arrowIndicator = '';
  if (domain.redirect && targetUrl) {
    const { color: arrowColor, title: arrowTitle } = getArrowStyle(domain);
    arrowIndicator = `<span class="${arrowColor} redirect-arrow" title="${arrowTitle}">→</span>`;
  }

  // Canonical icon prefix for domain name
  let canonicalIcon = '';
  if (domain.canonical_redirect) {
    const cr = domain.canonical_redirect;
    canonicalIcon = getCanonicalIcon(cr.sync_status, cr.updated_at, null, cr.template_id);
  }

  // Child row: indented with left border line
  const domainDisplay = `
    <div class="table-cell-stack table-cell-stack--child">
      ${canonicalIcon}
      <span class="table-cell-main">${domain.domain_name}</span>
      ${arrowIndicator}
    </div>
  `;

  const targetDisplay = getTargetDisplay(domain, false);
  const activityDisplay = getActivityDisplay(domain);
  const statusDisplay = getStatusDisplay(domain);
  const actions = getRowActions(domain);

  // Paused sites: show disabled checkbox with tooltip
  const checkbox = isPaused
    ? `
      <input
        type="checkbox"
        class="checkbox"
        disabled
        title="Site is ${domain.site_status} — excluded from bulk actions"
        aria-label="${domain.domain_name} (${domain.site_status})"
      />
    `
    : `
      <input
        type="checkbox"
        class="checkbox"
        data-redirect-checkbox
        data-domain-id="${domain.domain_id}"
        ${isSelected ? 'checked' : ''}
        aria-label="Select ${domain.domain_name}"
      />
    `;

  // Row classes: add muted styling for paused sites
  const rowClass = isPaused
    ? 'table__domain-row table__row--child table__row--paused'
    : 'table__domain-row table__row--child';

  return `
    <tr data-domain-id="${domain.domain_id}" data-site-id="${domain.site_id}" class="${rowClass}">
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
    !primaryDomains.has(r.domain_name) &&
    r.site_status !== 'paused' &&
    r.site_status !== 'archived'
  );
  const selectedCount = selectableDomains.filter(r => selectedRedirects.has(r.domain_id)).length;

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
  domain: ExtendedRedirectDomain,
  isPrimaryDomain: boolean,
  isTopLevel: boolean = false,
  allDonorsSelected: boolean = false,
  someDonorsSelected: boolean = false,
  redirectCountBadge: string = '',
  prefixIcon: string = ''
): string {
  // Tag badge for primary domains (sites) - shown after domain name
  let flagBadge = '';
  if (isPrimaryDomain && domain.site_tag) {
    flagBadge = `<span class="badge badge--sm badge--neutral">${domain.site_tag}</span>`;
  }

  // Mass-select checkbox or pause icon for primary domains
  let checkboxBefore = '';
  if (isPrimaryDomain) {
    const isPaused = domain.site_status === 'paused' || domain.site_status === 'archived';
    if (isPaused) {
      // Show pause icon instead of checkbox for paused/archived sites
      checkboxBefore = `
        <span
          class="icon icon--sm text-warning"
          data-icon="mono/pause"
          title="Site is ${domain.site_status} — excluded from bulk actions"
        ></span>
      `;
    } else {
      checkboxBefore = `
        <input
          type="checkbox"
          class="checkbox"
          data-select-site-domains="${domain.site_id}"
          ${allDonorsSelected ? 'checked' : ''}
          ${someDonorsSelected ? 'data-indeterminate="true"' : ''}
          aria-label="Select all domains of ${domain.domain_name}"
        />
      `;
    }
  }

  // Donor domains (redirect sources) - show colored unicode arrow AFTER domain
  let iconAfter = '';
  const targetUrl = getTargetUrl(domain.domain_name, domain.redirect);

  if (!isPrimaryDomain && targetUrl) {
    const { color: arrowColor, title: arrowTitle } = getArrowStyle(domain);
    iconAfter = `<span class="${arrowColor} redirect-arrow" title="${arrowTitle}">→</span>`;
  }

  return `
    <div class="table-cell-stack ${!isTopLevel ? 'table-cell-stack--child' : ''}">
      ${checkboxBefore}
      ${prefixIcon}
      <span class="table-cell-main">${domain.domain_name}</span>
      ${flagBadge}
      ${redirectCountBadge}
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
function getTargetDisplay(domain: ExtendedRedirectDomain, isPrimaryDomain: boolean): string {
  const targetUrl = getTargetUrl(domain.domain_name, domain.redirect);

  // Primary domains (sites) → show only site type badge (no domain duplicate)
  if (isPrimaryDomain && !targetUrl) {
    return `<span class="badge badge--sm badge--success">Landing</span>`;
  }

  // No redirect configured → show "+ Add" quick action on hover
  if (!targetUrl) {
    return `
      <div class="table-cell-empty-state">
        <span class="text-muted">No redirect</span>
        <button
          class="btn-link btn-link--sm table-cell-quick-action"
          type="button"
          data-action="add-redirect"
          data-domain-id="${domain.domain_id}"
          title="Add redirect"
        >
          <span class="icon" data-icon="mono/plus"></span>
          <span>Add</span>
        </button>
      </div>
    `;
  }

  // Redirect configured → show target domain (no arrow, since source domain already has →)
  const targetHost = targetUrl.replace('https://', '').replace('http://', '').split('/')[0];

  return `
    <div class="table-cell-inline">
      <span class="table-cell-main" title="${targetUrl}">${targetHost}</span>
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
function getActivityDisplay(domain: ExtendedRedirectDomain): string {
  // No redirect or no click data - show empty cell
  if (!domain.redirect || !domain.redirect.clicks_total) {
    return '';
  }

  // Has analytics data - show clicks + trend
  const clicks_7d = domain.redirect.clicks_total; // API doesn't have 7d breakdown yet
  const trend = domain.redirect.trend;

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
 * Get badge for canonical redirects (T3/T4) on acceptor domains
 * Shows template label with sync status color and tooltip
 */
function getCanonicalIcon(
  syncStatus: string | undefined,
  lastSyncAt: string | null | undefined,
  syncError: string | null | undefined,
  templateId: string
): string {
  const label = templateId === 'T4' ? 'www\u2192apex' : 'apex\u2192www';
  const status = syncStatus || 'never';

  let colorClass = 'text-muted';
  let tooltipContent = '';

  if (status === 'synced') {
    colorClass = 'text-ok';
    const syncDate = lastSyncAt ? formatTooltipTimestamp(lastSyncAt) : 'Unknown';
    tooltipContent = `<div class="tooltip tooltip--success"><div class="tooltip__header">${label}</div><div class="tooltip__body">Synced to CDN</div><div class="tooltip__footer">Last sync: ${syncDate}</div></div>`;
  } else if (status === 'pending') {
    colorClass = 'text-warning';
    tooltipContent = `<div class="tooltip tooltip--warning"><div class="tooltip__header">${label}</div><div class="tooltip__body">Pending sync to Cloudflare</div></div>`;
  } else if (status === 'error') {
    colorClass = 'text-danger';
    const errorMessage = syncError || 'Unknown error';
    tooltipContent = `<div class="tooltip tooltip--danger"><div class="tooltip__header">${label}</div><div class="tooltip__body">${errorMessage}</div></div>`;
  }

  if (tooltipContent) {
    return `<span class="${colorClass}" data-tooltip data-tooltip-content="${escapeHtml(tooltipContent)}">\u224B</span>`;
  }
  return `<span class="${colorClass}" title="${label} - not synced">\u224B</span>`;
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
function getStatusDisplay(domain: ExtendedRedirectDomain): string {
  // Acceptor domain (target site)
  if (domain.domain_role === 'acceptor') {
    // Default: "Target" badge; overridden to "Alert" if acceptor has problematic T1 redirect
    let baseBadge = '<span class="badge badge--brand" title="Redirect target (main site domain)">Target</span>';

    const targetUrl = getTargetUrl(domain.domain_name, domain.redirect);
    if (domain.redirect && targetUrl) {
      // Non-canonical redirect on acceptor — problematic state
      const targetHost = targetUrl.replace('https://', '').replace('http://', '').split('/')[0];
      const tooltipContent = `
        <div class="tooltip tooltip--danger">
          <div class="tooltip__header">Misconfigured Primary</div>
          <div class="tooltip__body">This domain redirects to ${targetHost}</div>
          <div class="tooltip__footer">Use "Clear primary redirect" to fix</div>
        </div>
      `.trim();
      baseBadge = `<span class="badge badge--danger" data-tooltip data-tooltip-content="${escapeHtml(tooltipContent)}">Alert</span>`;
    }

    return baseBadge;
  }

  // Donor: build main status badge
  const hasRedirect = domain.redirect !== null;
  const enabled = domain.redirect?.enabled ?? false;
  const syncStatus = domain.redirect?.sync_status;
  let mainBadge = '';

  if (!hasRedirect) {
    mainBadge = '<span class="badge badge--neutral" title="No redirect configured">Reserve</span>';
  } else if (!enabled) {
    mainBadge = '<span class="badge badge--neutral" title="Disabled by user">Disabled</span>';
  } else if (syncStatus === 'synced') {
    const syncDate = domain.redirect?.updated_at ? formatTooltipTimestamp(domain.redirect.updated_at) : 'Unknown';
    const tooltipContent = `<div class="tooltip tooltip--success"><div class="tooltip__header">Synced to CDN</div><div class="tooltip__body">Last sync: ${syncDate}</div></div>`.trim();
    mainBadge = `<span class="badge badge--success" data-tooltip data-tooltip-content="${escapeHtml(tooltipContent)}">Active</span>`;
  } else if (syncStatus === 'pending') {
    mainBadge = '<span class="badge badge--warning" title="Sync in progress">Pending</span>';
  } else if (syncStatus === 'error') {
    const lastAttempt = domain.redirect?.updated_at ? formatTooltipTimestamp(domain.redirect.updated_at) : 'Unknown';
    const tooltipContent = `<div class="tooltip tooltip--danger"><div class="tooltip__header">Sync Failed</div><div class="tooltip__body">Unknown error</div><div class="tooltip__footer">Last attempt: ${lastAttempt}</div></div>`.trim();
    mainBadge = `<span class="badge badge--danger" data-tooltip data-tooltip-content="${escapeHtml(tooltipContent)}">Error</span>`;
  } else {
    mainBadge = '<span class="badge badge--neutral" title="Not synced yet">New</span>';
  }

  return mainBadge;
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
function getRowActions(domain: ExtendedRedirectDomain): string {
  const isPrimaryDomain = primaryDomains.has(domain.domain_name);

  // Edit button (always present)
  const editButton = `
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit" data-domain-id="${domain.domain_id}" title="Edit redirect">
      <span class="icon" data-icon="mono/pencil-circle"></span>
    </button>
  `;

  // Primary domains: only Edit (no enable/disable)
  if (isPrimaryDomain) {
    return editButton;
  }

  // Donor domains without redirect: show "Add redirect" option
  if (!domain.redirect) {
    const kebabMenu = `
      <div class="dropdown" data-dropdown>
        <button class="btn-icon btn-icon--sm btn-icon--ghost dropdown__trigger" type="button" aria-haspopup="menu" title="More actions">
          <span class="icon" data-icon="mono/dots-vertical"></span>
        </button>
        <div class="dropdown__menu" role="menu">
          <button class="dropdown__item" type="button" data-action="add-redirect" data-domain-id="${domain.domain_id}">
            <span class="icon" data-icon="mono/plus"></span>
            <span>Add redirect</span>
          </button>
        </div>
      </div>
    `;
    return `${editButton} ${kebabMenu}`;
  }

  // Kebab menu for donor domains WITH redirect
  const enabled = domain.redirect.enabled;
  const syncStatus = domain.redirect.sync_status;
  const toggleLabel = !enabled ? 'Enable' : 'Disable';
  const toggleAction = !enabled ? 'enable' : 'disable';

  // Retry sync: only for error states (when enabled)
  const canRetrySync = enabled && syncStatus === 'error';
  const retryOption = canRetrySync ? `
    <button class="dropdown__item" type="button" data-action="retry-sync" data-domain-id="${domain.domain_id}">
      <span class="icon" data-icon="mono/refresh"></span>
      <span>Retry sync</span>
    </button>
  ` : '';

  // Sync now: available when enabled and not currently pending
  const canSyncNow = enabled && syncStatus !== 'pending';
  const syncNowOption = canSyncNow ? `
    <button class="dropdown__item" type="button" data-action="sync-now" data-domain-id="${domain.domain_id}">
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
        <button class="dropdown__item" type="button" data-action="${toggleAction}" data-domain-id="${domain.domain_id}">
          <span class="icon" data-icon="mono/${!enabled ? 'play' : 'pause'}"></span>
          <span>${toggleLabel}</span>
        </button>
        ${syncSection}
        <button class="dropdown__item dropdown__item--danger" type="button" data-action="delete" data-domain-id="${domain.domain_id}">
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
function getSiteHeaderActions(domain: ExtendedRedirectDomain, acceptorHasRedirect: boolean = false): string {
  // Edit Site button (opens drawer with site info)
  const editButton = `
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit-site" data-site-id="${domain.site_id}" data-domain-id="${domain.domain_id}" title="Edit site">
      <span class="icon" data-icon="mono/pencil-circle"></span>
    </button>
  `;

  // Clear primary redirect action (only if acceptor has redirect configured)
  const clearPrimaryRedirectAction = acceptorHasRedirect ? `
    <button class="dropdown__item dropdown__item--warning" type="button" data-action="clear-primary-redirect" data-domain-id="${domain.domain_id}">
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
        <button class="dropdown__item" type="button" data-action="manage-domains" data-site-id="${domain.site_id}">
          <span class="icon" data-icon="mono/web"></span>
          <span>Manage domains</span>
        </button>
        <div class="dropdown__divider"></div>
        <button class="dropdown__item dropdown__item--danger" type="button" data-action="clear-site-redirects" data-site-id="${domain.site_id}">
          <span class="icon" data-icon="mono/delete"></span>
          <span>Clear donor redirects</span>
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
      filteredRedirects = currentRedirects.filter(domain => {
        const targetUrl = getTargetUrl(domain.domain_name, domain.redirect);
        return domain.domain_name.toLowerCase().includes(query) ||
          (targetUrl && targetUrl.toLowerCase().includes(query)) ||
          domain.site_name.toLowerCase().includes(query) ||
          domain.project_name.toLowerCase().includes(query);
      });
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
      const hasRedirect = r.redirect !== null;
      if (activeFilters.configured!.includes('has-redirect') && hasRedirect) return true;
      if (activeFilters.configured!.includes('no-redirect') && !hasRedirect) return true;
      return false;
    });
  }

  // Apply sync filter (multi-select)
  if (activeFilters.sync && activeFilters.sync.length > 0) {
    result = result.filter(r => {
      const syncStatus = r.redirect?.sync_status ?? 'never';
      return activeFilters.sync!.includes(syncStatus);
    });
  }

  // Apply enabled filter (multi-select)
  if (activeFilters.enabled && activeFilters.enabled.length > 0) {
    result = result.filter(r => {
      const enabled = r.redirect?.enabled ?? false;
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

  // Delegate events for action buttons inside card
  card.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    if (!button) return;

    const action = button.dataset.action;
    const domainId = button.dataset.domainId ? Number(button.dataset.domainId) : null;
    const groupId = button.dataset.groupId ? Number(button.dataset.groupId) : null;
    const siteId = button.dataset.siteId ? Number(button.dataset.siteId) : null;

    switch (action) {
      case 'toggle-group':
        if (groupId !== null) handleToggleGroup(groupId);
        break;
      case 'edit':
        if (domainId) handleEdit(domainId);
        break;
      case 'edit-site':
        if (domainId) handleEditSite(domainId);
        break;
      case 'manage-domains':
        if (siteId) handleManageDomains(siteId);
        break;
      case 'clear-site-redirects':
        if (siteId) void handleClearSiteRedirects(siteId);
        break;
      case 'clear-primary-redirect':
        if (domainId) void handleClearPrimaryRedirect(domainId);
        break;
      case 'enable':
        if (domainId) void handleEnable(domainId);
        break;
      case 'disable':
        if (domainId) void handleDisable(domainId);
        break;
      case 'retry-sync':
        if (domainId) void handleRetrySync(domainId);
        break;
      case 'sync-now':
        if (domainId) void handleSyncNow(domainId);
        break;
      case 'delete':
        if (domainId) handleDelete(domainId);
        break;
      case 'add-redirect':
        if (domainId) handleAddRedirect(domainId);
        break;
      case 'retry':
        void refreshRedirects();
        break;
    }
  });

  // Delegate events for checkboxes
  card.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;

    // Individual checkbox
    if (target.hasAttribute('data-redirect-checkbox')) {
      const checkbox = target as HTMLInputElement;
      const domainId = Number(checkbox.dataset.domainId);
      if (checkbox.checked) {
        selectedRedirects.add(domainId);
      } else {
        selectedRedirects.delete(domainId);
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
        void handleBulkSync();
        break;
      case 'bulk-enable':
        void handleBulkEnable();
        break;
      case 'bulk-disable':
        void handleBulkDisable();
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
    for (const domainId of selectedRedirects) {
      const domain = currentRedirects.find(r => r.domain_id === domainId);
      if (domain?.redirect) {
        toDelete.push({ redirectId: domain.redirect.id, domainId });
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
        toDelete.map(({ redirectId }) => safeCall(() => deleteRedirect(redirectId), { lockKey: `redirect:delete:${redirectId}`, retryOn401: true }))
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
    void confirmDeleteRedirect();
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
function handleEdit(domainId: number): void {
  const domain = currentRedirects.find(r => r.domain_id === domainId);
  if (!domain) return;

  void openDrawer(domain);
}

/**
 * Handle edit site (opens drawer with site info)
 */
function handleEditSite(domainId: number): void {
  const domain = currentRedirects.find(r => r.domain_id === domainId);
  if (!domain) return;

  // Open drawer showing site/acceptor info
  void openDrawer(domain);
}

/**
 * Handle manage domains - redirect to domains page with site filter
 */
function handleManageDomains(siteId: number): void {
  // Open manage site domains drawer
  openManageSiteDomainsDrawer(siteId);
}

/**
 * Handle clear site redirects - removes all redirect configurations for the site
 */
async function handleClearSiteRedirects(siteId: number): Promise<void> {
  const siteDomains = currentRedirects.filter(r => r.site_id === siteId);
  const site = siteDomains[0];
  if (!site) return;

  const donorDomains = siteDomains.filter(d => d.redirect !== null && !primaryDomains.has(d.domain_name));

  if (donorDomains.length === 0) {
    showGlobalNotice('info', 'No redirects to clear for this site');
    return;
  }

  // TODO: Add dialog element `data-dialog="clear-site-redirects"` to redirects.html
  // with data-clear-site-name, data-clear-site-count, and data-confirm-delete attributes
  const confirmed = await showConfirmDialog('clear-site-redirects', {
    'clear-site-name': site.site_name,
    'clear-site-count': donorDomains.length.toString(),
  });
  if (!confirmed) return;

  try {
    let cleared = 0;
    for (const domain of donorDomains) {
      if (!domain.redirect) continue;
      await safeCall(() => deleteRedirect(domain.redirect!.id), { lockKey: `redirect:delete:${domain.redirect!.id}`, retryOn401: true });
      removeRedirectFromDomain(domain.domain_id);
      cleared++;
    }

    showGlobalNotice('success', `Cleared ${cleared} redirect(s) from ${site.site_name}`);
  } catch (error: any) {
    // Some may have been cleared before the error
    showGlobalNotice('error', error.message || 'Failed to clear redirects');
    // Refresh to get actual state
    await refreshRedirects();
  }
}

/**
 * Handle enable redirect
 */
async function handleEnable(domainId: number): Promise<void> {
  const domain = currentRedirects.find(r => r.domain_id === domainId);
  if (!domain?.redirect) return;

  const redirectId = domain.redirect.id;

  try {
    // Optimistic update
    updateDomainRedirect(domainId, { enabled: true, sync_status: 'pending' });
    renderTable();

    // API call
    await safeCall(() => updateRedirect(redirectId, { enabled: true }), { lockKey: `redirect:update:${redirectId}`, retryOn401: true });
    showGlobalNotice('success', `Enabled redirect for ${domain.domain_name}`);
  } catch (error: any) {
    // Rollback optimistic update
    updateDomainRedirect(domainId, { enabled: false });
    renderTable();
    showGlobalNotice('error', error.message || 'Failed to enable redirect');
  }
}

/**
 * Handle disable redirect
 */
async function handleDisable(domainId: number): Promise<void> {
  const domain = currentRedirects.find(r => r.domain_id === domainId);
  if (!domain?.redirect) return;

  const redirectId = domain.redirect.id;

  try {
    // Optimistic update
    updateDomainRedirect(domainId, { enabled: false, sync_status: 'pending' });
    renderTable();

    // API call
    await safeCall(() => updateRedirect(redirectId, { enabled: false }), { lockKey: `redirect:update:${redirectId}`, retryOn401: true });
    showGlobalNotice('success', `Disabled redirect for ${domain.domain_name}`);
  } catch (error: any) {
    // Rollback optimistic update
    updateDomainRedirect(domainId, { enabled: true });
    renderTable();
    showGlobalNotice('error', error.message || 'Failed to disable redirect');
  }
}

/**
 * Handle retry sync (same as sync now - triggers zone sync)
 */
async function handleRetrySync(domainId: number): Promise<void> {
  // Retry sync is the same as sync now - it triggers zone-level sync
  await handleSyncNow(domainId);
}

/**
 * Handle sync now - syncs the entire zone containing this redirect
 */
async function handleSyncNow(domainId: number): Promise<void> {
  const domain = currentRedirects.find(r => r.domain_id === domainId);
  if (!domain?.zone_id) {
    showGlobalNotice('error', 'Domain is not associated with a Cloudflare zone');
    return;
  }

  try {
    // Mark as pending in UI
    updateDomainRedirect(domainId, { sync_status: 'pending' });
    renderTable();

    // API call - sync entire zone
    const response = await safeCall(() => applyZoneRedirects(domain.zone_id), { lockKey: `zone:sync:${domain.zone_id}`, retryOn401: true });

    // Update state with synced redirects
    const syncedIds = response.synced_rules?.map(r => r.id) || [];
    markZoneSynced(domain.zone_id, syncedIds);
    renderTable();

    showGlobalNotice('success', `Synced ${response.rules_applied || 1} redirect(s) to Cloudflare`);
  } catch (error: any) {
    // Mark as error
    updateDomainRedirect(domainId, { sync_status: 'error' });
    renderTable();
    showGlobalNotice('error', error.message || 'Failed to sync to Cloudflare');
  }
}

// Pending delete redirect for confirmation dialog
let pendingDeleteRedirect: ExtendedRedirectDomain | null = null;

/**
 * Handle delete redirect - shows confirmation dialog
 */
function handleDelete(domainId: number): void {
  const domain = currentRedirects.find(r => r.domain_id === domainId);
  if (!domain) return;

  // Store domain for confirmation
  pendingDeleteRedirect = domain;

  // Update dialog with domain name
  const domainEl = document.querySelector('[data-delete-domain]');
  if (domainEl) {
    domainEl.textContent = domain.domain_name;
  }

  // Show confirmation dialog
  showDialog('delete-redirect');
}

/**
 * Confirm and execute delete redirect
 */
async function confirmDeleteRedirect(): Promise<void> {
  if (!pendingDeleteRedirect) return;

  const domain = pendingDeleteRedirect;
  pendingDeleteRedirect = null;

  // Hide dialog immediately
  hideDialog('delete-redirect');

  if (!domain.redirect) return;

  const redirectId = domain.redirect.id;
  const zoneId = domain.zone_id;

  try {
    // Optimistic update - remove from state
    removeRedirectFromDomain(domain.domain_id);
    renderTable();

    // Delete from DB
    await safeCall(() => deleteRedirect(redirectId), { lockKey: `redirect:delete:${redirectId}`, retryOn401: true });

    // Sync zone to CF to remove the orphaned redirect rule
    if (zoneId) {
      try {
        await safeCall(() => applyZoneRedirects(zoneId), { lockKey: `zone:sync:${zoneId}`, retryOn401: true });
      } catch (syncError) {
        console.warn('[confirmDeleteRedirect] Zone sync failed:', syncError);
      }
    }

    showGlobalNotice('success', `Deleted redirect for ${domain.domain_name}`);
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
async function handleClearPrimaryRedirect(domainId: number): Promise<void> {
  const domain = currentRedirects.find(r => r.domain_id === domainId);
  if (!domain?.redirect) return;

  const redirectId = domain.redirect.id;

  try {
    // Optimistic update - remove redirect but keep acceptor role
    removeRedirectFromDomain(domainId, true);
    renderTable();

    // API call
    await safeCall(() => deleteRedirect(redirectId), { lockKey: `redirect:delete:${redirectId}`, retryOn401: true });
    showGlobalNotice('success', `Cleared redirect from primary domain ${domain.domain_name}`);
  } catch (error: any) {
    // On error, refresh to restore state
    await refreshRedirects();
    showGlobalNotice('error', error.message || 'Failed to clear redirect');
  }
}

/**
 * Handle add redirect (for domains without redirect configured)
 */
function handleAddRedirect(domainId: number): void {
  const domain = currentRedirects.find(r => r.domain_id === domainId);
  if (!domain) return;

  void openDrawer(domain);
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
    !primaryDomains.has(r.domain_name) &&
    r.site_status !== 'paused' &&
    r.site_status !== 'archived'
  );

  if (checked) {
    // Select all donor domains of this site
    for (const domain of siteDomains) {
      selectedRedirects.add(domain.domain_id);
    }
  } else {
    // Deselect all donor domains of this site
    for (const domain of siteDomains) {
      selectedRedirects.delete(domain.domain_id);
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
    !primaryDomains.has(r.domain_name) &&
    r.site_status !== 'paused' &&
    r.site_status !== 'archived'
  );

  if (checked) {
    // Select all selectable domains
    for (const domain of selectableDomains) {
      selectedRedirects.add(domain.domain_id);
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
  const zoneIds = new Set<number>();
  const enabledDomainIds: number[] = [];
  const disabledDomainIds: number[] = [];

  for (const domainId of selectedRedirects) {
    const domain = currentRedirects.find(r => r.domain_id === domainId);
    if (domain?.zone_id) {
      zoneIds.add(domain.zone_id);
      if (domain.redirect?.enabled) {
        enabledDomainIds.push(domain.domain_id);
      } else {
        disabledDomainIds.push(domain.domain_id);
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
      const response = await safeCall(() => applyZoneRedirects(zoneId), { lockKey: `zone:sync:${zoneId}`, retryOn401: true });
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

  // Collect domain IDs and redirect IDs for optimistic update
  const domainIds: number[] = [];
  const redirectIds: number[] = [];
  for (const domainId of selectedRedirects) {
    const domain = currentRedirects.find(r => r.domain_id === domainId);
    if (domain?.redirect && !domain.redirect.enabled) {
      domainIds.push(domain.domain_id);
      redirectIds.push(domain.redirect.id);
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
      redirectIds.map(id => safeCall(() => updateRedirect(id, { enabled: true }), { lockKey: `redirect:update:${id}`, retryOn401: true }))
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

  // Collect domain IDs and redirect IDs for optimistic update
  const domainIds: number[] = [];
  const redirectIds: number[] = [];
  for (const domainId of selectedRedirects) {
    const domain = currentRedirects.find(r => r.domain_id === domainId);
    if (domain?.redirect && domain.redirect.enabled) {
      domainIds.push(domain.domain_id);
      redirectIds.push(domain.redirect.id);
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
      redirectIds.map(id => safeCall(() => updateRedirect(id, { enabled: false }), { lockKey: `redirect:update:${id}`, retryOn401: true }))
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
