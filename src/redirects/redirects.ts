/**
 * Redirects page UI logic
 *
 * Simple 301/302 domain redirects management
 * NOT to be confused with Streams/TDS (complex conditional routing)
 */

import { mockDomainRedirects, groupBySite, type DomainRedirect } from './mock-data';

let currentRedirects: DomainRedirect[] = [];
let filteredRedirects: DomainRedirect[] = [];
let collapsedGroups = new Set<number>();  // Set of collapsed site_ids
let selectedRedirects = new Set<number>(); // Set of selected redirect IDs
let targetDomains = new Set<string>(); // Set of domains that are redirect targets

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

  // Setup filters (future)
  // setupFilters();

  // Setup action buttons
  setupActions();
}

/**
 * Calculate which domains are redirect targets
 */
function calculateTargetDomains(redirects: DomainRedirect[]): Set<string> {
  const targets = new Set<string>();

  for (const redirect of redirects) {
    if (redirect.target_url) {
      // Extract domain from target URL
      const targetHost = redirect.target_url
        .replace('https://', '')
        .replace('http://', '')
        .split('/')[0];
      targets.add(targetHost);
    }
  }

  return targets;
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
    targetDomains = calculateTargetDomains(currentRedirects);

    if (loadingState) loadingState.hidden = true;

    if (currentRedirects.length === 0) {
      if (emptyState) emptyState.hidden = false;
    } else {
      renderTable();
      if (tableShell) tableShell.hidden = false;
    }
  }, 300);
}

/**
 * Render redirects table grouped by site
 */
function renderTable(): void {
  const tbody = document.querySelector('[data-redirects-tbody]');
  if (!tbody) return;

  const groups = groupBySite(filteredRedirects);

  const html = groups.map(group => {
    const isCollapsed = collapsedGroups.has(group.site_id);
    const chevronIcon = isCollapsed ? 'chevron-down' : 'chevron-up';

    const groupHeader = `
      <tr class="table__group-header" data-group-id="${group.site_id}">
        <td colspan="7">
          <button class="table__group-toggle" type="button" data-action="toggle-group" data-group-id="${group.site_id}">
            <span class="table__group-title">
              <span class="table__group-flag">${group.site_flag}</span>
              <span class="table__group-name">${group.site_name}</span>
            </span>
            <span class="table__group-count">
              ${group.domains.length} domains
              <span class="icon" data-icon="mono/${chevronIcon}"></span>
            </span>
          </button>
        </td>
      </tr>
    `;

    const rows = isCollapsed ? '' : group.domains.map(redirect => renderRow(redirect)).join('');

    return groupHeader + rows;
  }).join('');

  tbody.innerHTML = html;

  // Update counts
  const shownCount = document.querySelector('[data-shown-count]');
  const totalCount = document.querySelector('[data-total-count]');
  if (shownCount) shownCount.textContent = String(filteredRedirects.length);
  if (totalCount) totalCount.textContent = String(currentRedirects.length);
}

/**
 * Render single redirect row
 */
function renderRow(redirect: DomainRedirect): string {
  const isTargetDomain = targetDomains.has(redirect.domain);
  const isSelected = selectedRedirects.has(redirect.id);
  const rowClass = [
    redirect.domain_status === 'expired' ? 'table__row--muted' : '',
    isTargetDomain ? 'table__row--target' : ''
  ].filter(Boolean).join(' ');

  const checkbox = getCheckboxDisplay(redirect, isTargetDomain);
  const domainDisplay = getDomainDisplay(redirect, isTargetDomain);
  const targetDisplay = getTargetDisplay(redirect);
  const codeDisplay = getCodeDisplay(redirect);
  const stateDisplay = getStateDisplay(redirect);
  const syncDisplay = getSyncDisplay(redirect);
  const actions = getRowActions(redirect);

  return `
    <tr data-redirect-id="${redirect.id}" class="${rowClass}">
      <td class="table__cell-checkbox">
        ${checkbox}
      </td>
      <td class="table__cell-domain">
        ${domainDisplay}
      </td>
      <td class="table__cell-target">
        ${targetDisplay}
      </td>
      <td class="table__cell-code">
        ${codeDisplay}
      </td>
      <td class="table__cell-state">
        ${stateDisplay}
      </td>
      <td class="table__cell-sync">
        ${syncDisplay}
      </td>
      <td class="table__cell-actions">
        <div class="table-actions table-actions--inline">
          ${actions}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Get checkbox or target icon
 */
function getCheckboxDisplay(redirect: DomainRedirect, isTargetDomain: boolean): string {
  if (isTargetDomain) {
    return `
      <span class="icon text-primary" data-icon="mono/staging" title="This domain is a redirect target"></span>
    `;
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
 */
function getDomainDisplay(redirect: DomainRedirect, isTargetDomain: boolean): string {
  const statusBadge = redirect.domain_status !== 'active'
    ? `<span class="badge badge--xs badge--${redirect.domain_status === 'parked' ? 'neutral' : 'danger'}">${redirect.domain_status}</span>`
    : '';

  // Show arrow-bottom-right icon for source domains (not targets)
  const sourceIcon = !isTargetDomain && redirect.target_url
    ? `<span class="icon text-muted" data-icon="mono/arrow-bottom-right"></span>`
    : '';

  return `
    <div class="table-cell-stack">
      ${sourceIcon}
      <span class="table-cell-main">${redirect.domain}</span>
      ${statusBadge}
    </div>
  `;
}

/**
 * Get target display
 */
function getTargetDisplay(redirect: DomainRedirect): string {
  if (!redirect.target_url) {
    return '<span class="text-muted">No redirect</span>';
  }

  const targetHost = redirect.target_url.replace('https://', '').replace('http://', '').split('/')[0];

  return `
    <div class="table-cell-inline">
      <span class="icon text-muted" data-icon="mono/arrow-top-right"></span>
      <span class="table-cell-main" title="${redirect.target_url}">${targetHost}</span>
    </div>
  `;
}

/**
 * Get redirect code badge
 */
function getCodeDisplay(redirect: DomainRedirect): string {
  if (!redirect.target_url) {
    return '<span class="text-muted">—</span>';
  }

  const badgeClass = redirect.redirect_code === 301 ? 'badge--success' : 'badge--warning';
  return `<span class="badge badge--sm ${badgeClass}">${redirect.redirect_code}</span>`;
}

/**
 * Get combined state badge (enabled + sync)
 */
function getStateDisplay(redirect: DomainRedirect): string {
  if (!redirect.enabled || !redirect.target_url) {
    return '<span class="badge badge--neutral">Disabled</span>';
  }

  // Enabled + sync status combined
  if (redirect.sync_status === 'synced') {
    return '<span class="badge badge--success">Active</span>';
  }

  if (redirect.sync_status === 'pending') {
    return '<span class="badge badge--primary">Pending</span>';
  }

  if (redirect.sync_status === 'error') {
    const errorTooltip = redirect.sync_error
      ? `title="${redirect.sync_error}"`
      : '';
    return `<span class="badge badge--danger" ${errorTooltip}>Error</span>`;
  }

  return '<span class="badge badge--neutral">Unknown</span>';
}

/**
 * Get sync timestamp display
 */
function getSyncDisplay(redirect: DomainRedirect): string {
  if (!redirect.last_sync_at) {
    return '<span class="text-muted">—</span>';
  }

  const date = new Date(redirect.last_sync_at);
  const formatted = date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<span class="text-sm">${formatted}</span>`;
}

/**
 * Get row actions
 */
function getRowActions(redirect: DomainRedirect): string {
  const isDisabled = !redirect.enabled || !redirect.target_url;
  const toggleAction = isDisabled ? 'enable' : 'disable';
  const toggleIcon = isDisabled ? 'mono/arrow-up' : 'mono/pause';
  const toggleTitle = isDisabled ? 'Enable redirect' : 'Disable redirect';
  const toggleClass = isDisabled ? 'btn-icon--neutral' : 'btn-icon--ghost';

  return `
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit" data-redirect-id="${redirect.id}" title="Edit redirect">
      <span class="icon" data-icon="mono/pencil-circle"></span>
    </button>
    <button class="btn-icon btn-icon--sm ${toggleClass}" type="button" data-action="${toggleAction}" data-redirect-id="${redirect.id}" title="${toggleTitle}">
      <span class="icon" data-icon="${toggleIcon}"></span>
    </button>
  `;
}

/**
 * Setup search
 */
function setupSearch(): void {
  const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
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

    renderTable();
  });
}

/**
 * Setup action buttons
 */
function setupActions(): void {
  const card = document.querySelector('[data-redirects-card]');
  if (!card) return;

  // Delegate events for action buttons
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
      case 'add-redirect':
        handleAddRedirect();
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
      updateBulkActionsBar();
    }

    // Select all checkbox
    if (target.hasAttribute('data-select-all-redirects')) {
      const selectAll = target as HTMLInputElement;
      handleSelectAll(selectAll.checked);
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

  console.log('[Redirects] Edit redirect:', redirect.domain);
  alert(`✏️ Edit "${redirect.domain}"\n\nTarget: ${redirect.target_url || 'None'}\nCode: ${redirect.redirect_code}\n\n(Drawer UI coming soon)`);
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
 * Handle add redirect
 */
function handleAddRedirect(): void {
  console.log('[Redirects] Add redirect');
  alert('➕ Add new redirect\n\n(Drawer coming soon)');
}

/**
 * Handle select all redirects
 */
function handleSelectAll(checked: boolean): void {
  if (checked) {
    // Select only redirects that are not target domains
    for (const redirect of filteredRedirects) {
      if (!targetDomains.has(redirect.domain)) {
        selectedRedirects.add(redirect.id);
      }
    }
  } else {
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
 * Update bulk actions bar visibility and count
 */
function updateBulkActionsBar(): void {
  const bulkBar = document.querySelector('[data-bulk-actions]');
  const countEl = document.querySelector('[data-selected-count]');

  if (!bulkBar || !countEl) return;

  const count = selectedRedirects.size;
  countEl.textContent = String(count);

  if (count > 0) {
    bulkBar.hidden = false;
  } else {
    bulkBar.hidden = true;
  }

  // Update select-all checkbox state
  const selectAllCheckbox = document.querySelector('[data-select-all-redirects]') as HTMLInputElement;
  if (selectAllCheckbox) {
    const selectableCount = filteredRedirects.filter(r => !targetDomains.has(r.domain)).length;
    selectAllCheckbox.checked = count === selectableCount && count > 0;
    selectAllCheckbox.indeterminate = count > 0 && count < selectableCount;
  }
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
  const confirmed = confirm(`Are you sure you want to delete ${count} redirect(s)?\n\nThis action cannot be undone.`);

  if (!confirmed) return;

  console.log('[Redirects] Bulk delete:', count, 'redirects');
  alert(`🗑️ Delete ${count} redirect(s)\n\n(API integration coming soon)`);
}
