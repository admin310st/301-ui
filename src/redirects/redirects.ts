/**
 * Redirects page UI logic
 *
 * Simple 301/302 domain redirects management
 * NOT to be confused with Streams/TDS (complex conditional routing)
 */

import { mockDomainRedirects, groupByProject, type DomainRedirect, type ProjectGroup, type TargetSubgroup } from './mock-data';
import { getDefaultFilters, hasActiveFilters, type ActiveFilters } from './filters-config';
import { renderFilterBar, initFilterUI } from './filters-ui';
import { adjustDropdownPosition } from '@ui/dropdown';
import { initDrawer, openDrawer, openBulkAddDrawer } from './drawer';
import { showDialog, hideDialog } from '@ui/dialog';
import { formatTooltipTimestamp, initTooltips } from '@ui/tooltip';
import { initSyncStatus } from './sync-status';
import { updateBulkActionsBar as updateBulkActions } from '@ui/bulk-actions';

let currentRedirects: DomainRedirect[] = [];
let filteredRedirects: DomainRedirect[] = [];
let collapsedGroups = new Set<number>();  // Set of collapsed site_ids
let selectedRedirects = new Set<number>(); // Set of selected redirect IDs
let primaryDomains = new Set<string>(); // Set of primary domains (main domains of sites)
let activeFilters: ActiveFilters = getDefaultFilters(); // Active filters state

/**
 * Initialize redirects page
 */
export function initRedirectsPage(): void {
  const card = document.querySelector('[data-redirects-card]');
  if (!card) return;

  console.log('[Redirects] Initializing page...');

  // Load mock data
  loadRedirects();

  // Setup search
  setupSearch();

  // Setup filters
  setupFilters();

  // Setup action buttons
  setupActions();

  // Dropdown toggles (delegated)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const trigger = target.closest('.dropdown__trigger');

    if (trigger) {
      e.stopPropagation();
      const dropdown = trigger.closest('.dropdown');
      if (!dropdown) return;

      const isOpen = dropdown.classList.contains('dropdown--open');

      // Close all other dropdowns
      document.querySelectorAll('.dropdown--open').forEach((other) => {
        if (other !== dropdown) {
          other.classList.remove('dropdown--open');
          const otherTrigger = other.querySelector('.dropdown__trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      if (isOpen) {
        dropdown.classList.remove('dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
        // Remove positioning class when closing
        const menu = dropdown.querySelector('.dropdown__menu');
        if (menu) menu.classList.remove('dropdown__menu--up');
      } else {
        dropdown.classList.add('dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
        // Apply smart positioning after opening
        requestAnimationFrame(() => {
          adjustDropdownPosition(dropdown);
        });
      }
    } else {
      // Close all dropdowns when clicking outside
      document.querySelectorAll('.dropdown--open').forEach((dropdown) => {
        dropdown.classList.remove('dropdown--open');
        const trigger = dropdown.querySelector('.dropdown__trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Initialize drawer
  initDrawer();
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
 * Render redirects table grouped by project
 */
function renderTable(): void {
  const tbody = document.querySelector('[data-redirects-tbody]');
  if (!tbody) return;

  const groups = groupByProject(filteredRedirects);

  const html = groups.map(group => {
    const isCollapsed = collapsedGroups.has(group.project_id);
    const chevronIcon = isCollapsed ? 'chevron-down' : 'chevron-up';

    // Calculate domain statistics for tooltip
    const allDomains = group.targets.flatMap(t => t.domains);
    const redirectedCount = allDomains.filter(d => d.has_redirect).length;
    // Reserve = domains without redirect, excluding disabled and expired
    const reserveCount = allDomains.filter(d =>
      !d.has_redirect &&
      d.enabled &&
      d.domain_status !== 'expired'
    ).length;
    const tooltipText = `${group.totalDomains} domains in project: ${redirectedCount} redirected, ${reserveCount} in reserve`;

    // Project header row (Level 0)
    const projectHeader = `
      <tr class="table__group-header table__row--level-0" data-group-id="${group.project_id}">
        <td colspan="6">
          <button class="table__group-toggle" type="button" data-action="toggle-group" data-group-id="${group.project_id}" aria-expanded="${!isCollapsed}">
            <span class="icon" data-icon="mono/${chevronIcon}"></span>
            <span class="table__group-title">
              <span class="icon" data-icon="mono/layers"></span>
              <span class="table__group-name">${group.project_name}</span>
              <span class="badge badge--sm badge--neutral" title="${tooltipText}">${group.totalDomains}</span>
            </span>
          </button>
        </td>
      </tr>
    `;

    // Target subgroups + domain rows (Level 1 & 2)
    const targetRows = isCollapsed ? '' : group.targets.map(target => {
      return renderTargetSubgroup(target, group.project_id);
    }).join('');

    return projectHeader + targetRows;
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

  // Note: Dropdowns initialized once in initRedirectsPage() via event delegation

  // Update counts
  const shownCount = document.querySelector('[data-shown-count]');
  const totalCount = document.querySelector('[data-total-count]');
  if (shownCount) shownCount.textContent = String(filteredRedirects.length);
  if (totalCount) totalCount.textContent = String(currentRedirects.length);
}

/**
 * Update global select-all checkbox state
 */
function updateGlobalCheckbox(): void {
  const globalCheckbox = document.querySelector('[data-select-all-global]') as HTMLInputElement;
  if (!globalCheckbox) return;

  const selectableDomains = filteredRedirects.filter(r => !primaryDomains.has(r.domain));
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
 * Render target subgroup (Level 1) with its domain rows (Level 2)
 * For 'site' type: primary domain becomes the header (no duplication)
 * For 'redirect'/'none' type: show all domains at same level
 */
function renderTargetSubgroup(target: TargetSubgroup, projectId: number): string {
  if (target.target_type === 'site') {
    // Primary domain case: first domain is the site, rest are in same site
    const primaryDomain = target.domains[0];
    const otherDomains = target.domains.slice(1);

    // Count only actual redirects to primary (not "No redirect" domains)
    const actualRedirects = otherDomains.filter(d =>
      d.has_redirect &&
      d.target_url &&
      d.target_url.toLowerCase().includes(primaryDomain.domain.toLowerCase())
    );

    // Render primary domain as target header (Level 1) - enhanced domain row
    const primaryRow = renderPrimaryDomainRow(primaryDomain, target.site_type!, actualRedirects, otherDomains, projectId);

    // Render ALL other domains in site (Level 2) - both redirecting and non-redirecting
    const childRows = otherDomains.map((redirect, index) => {
      const isLastRow = index === otherDomains.length - 1;
      return renderRow(redirect, projectId, isLastRow, false);
    }).join('');

    return primaryRow + childRows;
  } else {
    // No primary domain: just render all domains at Level 1 (flat)
    return target.domains.map((redirect, index) => {
      const isLastRow = index === target.domains.length - 1;
      return renderRow(redirect, projectId, isLastRow, false, true); // isTopLevel = true
    }).join('');
  }
}

/**
 * Render primary domain row (enhanced - acts as target subgroup header)
 * Shows site type badge + count of domains redirecting to it
 */
function renderPrimaryDomainRow(
  redirect: DomainRedirect,
  siteType: string,
  actualRedirects: DomainRedirect[],
  allDonorDomains: DomainRedirect[],
  groupId: number
): string {
  const isSelected = selectedRedirects.has(redirect.id);
  const checkbox = getPrimaryDomainCheckbox(redirect);

  // Calculate mass-select checkbox state
  const selectedDonors = allDonorDomains.filter(d => selectedRedirects.has(d.id));
  const allDonorsSelected = allDonorDomains.length > 0 && selectedDonors.length === allDonorDomains.length;
  const someDonorsSelected = selectedDonors.length > 0 && selectedDonors.length < allDonorDomains.length;

  const siteBadge = getSiteTypeBadge(siteType);

  // Determine redirect badge color based on redirect codes
  let redirectBadge = '';
  if (actualRedirects.length > 0) {
    const has301 = actualRedirects.some(r => r.redirect_code === 301);
    const has302 = actualRedirects.some(r => r.redirect_code === 302);

    // All 301 → green, Mixed or all 302 → orange/yellow
    const badgeColor = has301 && !has302 ? 'text-ok' : 'text-warning';
    const redirectType = has301 && !has302 ? 'Permanent (301)' : has302 && !has301 ? 'Temporary (302)' : 'Mixed (301+302)';

    redirectBadge = `<span class="badge badge--sm badge--neutral" title="${actualRedirects.length} domain${actualRedirects.length > 1 ? 's' : ''} redirecting to this primary domain (${redirectType})">
        <span class="icon ${badgeColor}">←</span>
        <span>${actualRedirects.length}</span>
      </span>`;
  }

  const domainDisplay = getDomainDisplay(redirect, true, true, allDonorsSelected, someDonorsSelected, redirectBadge); // isPrimary=true, isTopLevel=true
  const activityDisplay = getActivityDisplay(redirect);
  const statusDisplay = getStatusDisplay(redirect);
  const actions = getRowActions(redirect);

  return `
    <tr data-redirect-id="${redirect.id}" data-group-id="${groupId}" class="table__primary-domain table__row--level-1">
      <td data-priority="critical" class="table__cell-domain">
        ${domainDisplay}
      </td>
      <td data-priority="critical" class="table__cell-target">
        ${siteBadge}
      </td>
      <td data-priority="medium" class="table__cell-activity">
        ${activityDisplay}
      </td>
      <td data-priority="high" class="table__cell-status">
        ${statusDisplay}
      </td>
      <td data-priority="critical" class="table__cell-actions">
        ${actions}
      </td>
      <td data-priority="critical" class="table__cell-checkbox">
        ${checkbox}
      </td>
    </tr>
  `;
}

/**
 * Get site type badge HTML
 */
function getSiteTypeBadge(siteType: string): string {
  const badges = {
    landing: '<span class="badge badge--sm badge--success">Landing</span>',
    tds: '<span class="badge badge--sm badge--brand">TDS</span>',
    hybrid: '<span class="badge badge--sm badge--warning">Hybrid</span>',
  };
  return badges[siteType as keyof typeof badges] || '';
}

/**
 * Get lock icon for primary domain in checkbox column (sites cannot be individually selected)
 */
function getPrimaryDomainCheckbox(redirect: DomainRedirect): string {
  return `
    <span class="icon text-muted" data-icon="mono/lock" title="Primary domain - use mass-select checkbox"></span>
  `;
}

/**
 * Render single redirect row
 */
function renderRow(redirect: DomainRedirect, groupId: number, isLastRow: boolean, isNewSite: boolean, isTopLevel: boolean = false): string {
  const isPrimaryDomain = primaryDomains.has(redirect.domain);
  const isSelected = selectedRedirects.has(redirect.id);
  const rowClass = [
    'table__domain-row',
    isTopLevel ? 'table__row--level-1' : 'table__row--level-2',
    redirect.domain_status === 'expired' ? 'table__row--muted' : '',
    isPrimaryDomain ? 'table__row--primary' : ''
  ].filter(Boolean).join(' ');

  const checkbox = getCheckboxDisplay(redirect, isPrimaryDomain);
  const domainDisplay = getDomainDisplay(redirect, isPrimaryDomain, isTopLevel);
  const targetDisplay = getTargetDisplay(redirect, isPrimaryDomain);
  const activityDisplay = getActivityDisplay(redirect);
  const statusDisplay = getStatusDisplay(redirect);
  const actions = getRowActions(redirect);

  return `
    <tr data-redirect-id="${redirect.id}" data-group-id="${groupId}" class="${rowClass}">
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
 * Get checkbox display (primary domains don't have checkboxes)
 */
function getCheckboxDisplay(redirect: DomainRedirect, isPrimaryDomain: boolean): string {
  if (isPrimaryDomain) {
    // Primary domains don't have checkboxes - they are main site domains
    return '';
  }

  const isSelected = selectedRedirects.has(redirect.id);
  return `
    <input
      type="checkbox"
      class="checkbox"
      data-redirect-checkbox
      data-redirect-id="${redirect.id}"
      ${isSelected ? 'checked' : ''}
      aria-label="Select ${redirect.domain}"
    />
  `;
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

  // Flag badge for primary domains (sites) - shown after domain name
  const flagBadge = isPrimaryDomain
    ? `<span class="badge badge--sm badge--neutral">${redirect.site_flag}</span>`
    : '';

  // Mass-select checkbox for primary domains (before domain name, where landing icon was)
  let checkboxBefore = '';
  if (isPrimaryDomain) {
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

  // Donor domains (redirect sources) - show colored unicode arrow AFTER domain
  let iconAfter = '';

  if (!isPrimaryDomain && redirect.target_url) {
    // Color arrow based on redirect type: 301 = green (permanent), 302 = orange (temporary)
    const arrowColor = redirect.redirect_code === 301 ? 'text-ok' : 'text-warning';
    const redirectType = redirect.redirect_code === 301 ? 'Permanent (301)' : 'Temporary (302)';
    iconAfter = `<span class="${arrowColor}" style="font-size: 1.125rem; line-height: 1;" title="Donor - ${redirectType} redirect">→</span>`;
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
  // Acceptor domain (target site) - show "Target" badge
  if (redirect.role === 'acceptor') {
    return '<span class="badge badge--neutral" title="Redirect target (main site domain)">Target</span>';
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

  // Kebab menu for donor domains
  const isDisabled = !redirect.enabled;
  const toggleLabel = isDisabled ? 'Enable' : 'Disable';
  const toggleAction = isDisabled ? 'enable' : 'disable';

  // Retry sync: only for error and never states (when enabled and has redirect)
  const canRetrySync = redirect.has_redirect && redirect.enabled &&
    (redirect.sync_status === 'error' || redirect.sync_status === 'never');
  const retryOption = canRetrySync ? `
    <button class="dropdown__item" type="button" data-action="retry-sync" data-redirect-id="${redirect.id}">
      <span class="icon" data-icon="mono/refresh"></span>
      <span>Retry sync</span>
    </button>
  ` : '';

  // Sync now: available when enabled, has redirect, and not currently pending
  const canSyncNow = redirect.has_redirect && redirect.enabled && redirect.sync_status !== 'pending';
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
 */
function applyFilters(): void {
  let result = [...currentRedirects];

  // Apply project filter (multi-select)
  if (activeFilters.project && activeFilters.project.length > 0) {
    const projectIds = activeFilters.project.map(id => Number(id));
    result = result.filter(r => projectIds.includes(r.project_id));
  }

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

    console.log('[Redirects] Action:', action, 'Redirect ID:', redirectId, 'Group ID:', groupId);

    switch (action) {
      case 'toggle-group':
        if (groupId !== null) handleToggleGroup(groupId);
        break;
      case 'edit':
        if (redirectId) handleEdit(redirectId);
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
  confirmBulkDeleteBtn?.addEventListener('click', () => {
    const count = selectedRedirects.size;
    if (count === 0) {
      hideDialog('bulk-delete-redirects');
      return;
    }

    console.log('[Redirects] Confirmed bulk delete:', count, 'redirects');
    // TODO: Implement actual delete API call
    // await api.deleteRedirects(Array.from(selectedRedirects));

    // Close dialog and clear selections
    hideDialog('bulk-delete-redirects');
    handleClearSelection();

    // Show success notification (when implemented)
    alert(`Successfully deleted ${count} redirect(s)\n\n(API integration coming soon)`);
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
 * Handle enable redirect
 */
function handleEnable(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  console.log('[Redirects] Enable redirect:', redirect.domain);
  alert(`▶️ Enable "${redirect.domain}"\n\n(API integration coming soon)`);
}

/**
 * Handle disable redirect
 */
function handleDisable(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  console.log('[Redirects] Disable redirect:', redirect.domain);
  alert(`⏸️ Disable "${redirect.domain}"\n\n(API integration coming soon)`);
}

/**
 * Handle retry sync
 */
function handleRetrySync(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  console.log('[Redirects] Retry sync:', redirect.domain);
  alert(`🔄 Retry sync for "${redirect.domain}"\n\n(API integration coming soon)`);
}

/**
 * Handle sync now
 */
function handleSyncNow(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  console.log('[Redirects] Sync now:', redirect.domain);
  alert(`☁️ Sync to Cloudflare for "${redirect.domain}"\n\n(API integration coming soon)`);
}

/**
 * Handle delete redirect
 */
function handleDelete(redirectId: number): void {
  const redirect = currentRedirects.find(r => r.id === redirectId);
  if (!redirect) return;

  const confirmed = confirm(`Delete redirect for "${redirect.domain}"?\n\nThis action cannot be undone.`);
  if (!confirmed) return;

  console.log('[Redirects] Delete redirect:', redirect.domain);
  alert(`🗑️ Delete "${redirect.domain}"\n\n(API integration coming soon)`);
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
 */
function handleSelectSiteDomains(siteId: number, checked: boolean): void {
  // Get all domains that belong to this site (excluding the primary domain itself)
  const siteDomains = filteredRedirects.filter(r =>
    r.site_id === siteId && !primaryDomains.has(r.domain)
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
 */
function handleSelectAllGlobal(checked: boolean): void {
  const selectableDomains = filteredRedirects.filter(r => !primaryDomains.has(r.domain));

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
 */
function handleBulkSync(): void {
  const count = selectedRedirects.size;
  console.log('[Redirects] Bulk sync:', count, 'redirects');
  alert(`☁️ Sync ${count} redirect(s) to Cloudflare\n\n(API integration coming soon)`);
}

/**
 * Handle bulk enable
 */
function handleBulkEnable(): void {
  const count = selectedRedirects.size;
  console.log('[Redirects] Bulk enable:', count, 'redirects');
  alert(`▶️ Enable ${count} redirect(s)\n\n(API integration coming soon)`);
}

/**
 * Handle bulk disable
 */
function handleBulkDisable(): void {
  const count = selectedRedirects.size;
  console.log('[Redirects] Bulk disable:', count, 'redirects');
  alert(`⏸️ Disable ${count} redirect(s)\n\n(API integration coming soon)`);
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
