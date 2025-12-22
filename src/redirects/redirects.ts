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
let primaryDomains = new Set<string>(); // Set of primary domains (main domains of sites)

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
 * Calculate which domains are primary domains (main domains of sites)
 * Primary domain: has no redirect (target_url === null) and is a target for other domains
 */
function calculatePrimaryDomains(redirects: DomainRedirect[]): Set<string> {
  const primary = new Set<string>();
  const targets = new Set<string>();

  // First, collect all target domains
  for (const redirect of redirects) {
    if (redirect.target_url) {
      const targetHost = redirect.target_url
        .replace('https://', '')
        .replace('http://', '')
        .split('/')[0];
      targets.add(targetHost);
    }
  }

  // Then, find domains that are targets but don't redirect themselves
  for (const redirect of redirects) {
    if (!redirect.target_url && targets.has(redirect.domain)) {
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

    // Check if all selectable domains in this group are selected
    const selectableDomains = group.domains.filter(d => !primaryDomains.has(d.domain));
    const selectedInGroup = selectableDomains.filter(d => selectedRedirects.has(d.id));
    const allSelected = selectableDomains.length > 0 && selectedInGroup.length === selectableDomains.length;
    const someSelected = selectedInGroup.length > 0 && selectedInGroup.length < selectableDomains.length;

    const groupHeader = `
      <tr class="table__group-header" data-group-id="${group.site_id}">
        <td colspan="6">
          <button class="table__group-toggle" type="button" data-action="toggle-group" data-group-id="${group.site_id}">
            <span class="icon" data-icon="mono/${chevronIcon}"></span>
            <span class="table__group-title">
              <span class="table__group-flag">${group.site_flag}</span>
              <span class="table__group-name">${group.site_name}</span>
            </span>
            <span class="table__group-count">${group.domains.length} domains</span>
          </button>
        </td>
        <td class="table__group-checkbox">
          <input
            type="checkbox"
            class="checkbox"
            data-select-group="${group.site_id}"
            ${allSelected ? 'checked' : ''}
            ${someSelected ? 'data-indeterminate="true"' : ''}
            aria-label="Select all in ${group.site_name}"
          />
        </td>
      </tr>
    `;

    const rows = isCollapsed ? '' : group.domains.map(redirect => renderRow(redirect)).join('');

    return groupHeader + rows;
  }).join('');

  tbody.innerHTML = html;

  // Set indeterminate state for group checkboxes
  const groupCheckboxes = tbody.querySelectorAll('[data-indeterminate="true"]');
  groupCheckboxes.forEach(cb => {
    (cb as HTMLInputElement).indeterminate = true;
  });

  // Update global select-all checkbox state
  updateGlobalCheckbox();

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
 * Render single redirect row
 */
function renderRow(redirect: DomainRedirect): string {
  const isPrimaryDomain = primaryDomains.has(redirect.domain);
  const isSelected = selectedRedirects.has(redirect.id);
  const rowClass = [
    redirect.domain_status === 'expired' ? 'table__row--muted' : '',
    isPrimaryDomain ? 'table__row--primary' : ''
  ].filter(Boolean).join(' ');

  const checkbox = getCheckboxDisplay(redirect, isPrimaryDomain);
  const domainDisplay = getDomainDisplay(redirect, isPrimaryDomain);
  const targetDisplay = getTargetDisplay(redirect);
  const codeDisplay = getCodeDisplay(redirect);
  const stateDisplay = getStateDisplay(redirect);
  const syncDisplay = getSyncDisplay(redirect);
  const actions = getRowActions(redirect);

  return `
    <tr data-redirect-id="${redirect.id}" class="${rowClass}">
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
      <td class="table__cell-checkbox">
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
 */
function getDomainDisplay(redirect: DomainRedirect, isPrimaryDomain: boolean): string {
  const statusBadge = redirect.domain_status !== 'active'
    ? `<span class="badge badge--xs badge--${redirect.domain_status === 'parked' ? 'neutral' : 'danger'}">${redirect.domain_status}</span>`
    : '';

  // Primary domain (main site domain) receives traffic → arrow-right → in blue
  // Donor domains (sources) send traffic → arrow-top-right ↗️ in gray
  let icon = '';
  if (isPrimaryDomain) {
    icon = `<span class="icon text-primary" data-icon="mono/arrow-right" title="Main domain - receives traffic"></span>`;
  } else if (redirect.target_url) {
    icon = `<span class="icon text-muted" data-icon="mono/arrow-top-right"></span>`;
  }

  return `
    <div class="table-cell-stack">
      ${icon}
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

  // Target domains receive traffic → arrow-bottom-right ↘️
  return `
    <div class="table-cell-inline">
      <span class="icon text-muted" data-icon="mono/arrow-bottom-right"></span>
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
 * Get sync timestamp display (date only, time in drawer)
 */
function getSyncDisplay(redirect: DomainRedirect): string {
  if (!redirect.last_sync_at) {
    return '<span class="text-muted">—</span>';
  }

  const date = new Date(redirect.last_sync_at);
  const formatted = date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return `<span class="text-sm">${formatted}</span>`;
}

/**
 * Get row actions
 */
function getRowActions(redirect: DomainRedirect): string {
  const isPrimaryDomain = primaryDomains.has(redirect.domain);

  // Edit button (always present)
  const editButton = `
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit" data-redirect-id="${redirect.id}" title="Edit redirect">
      <span class="icon" data-icon="mono/pencil-circle"></span>
    </button>
  `;

  // Primary domains don't have toggle - they are main site domains that receive traffic
  if (isPrimaryDomain) {
    return editButton;
  }

  // Toggle button for source domains
  const isDisabled = !redirect.enabled || !redirect.target_url;
  const toggleAction = isDisabled ? 'enable' : 'disable';
  const toggleIcon = isDisabled ? 'mono/play' : 'mono/pause';
  const toggleTitle = isDisabled ? 'Enable redirect' : 'Disable redirect';
  const toggleClass = isDisabled ? 'btn-icon--primary' : 'btn-icon--ghost';

  return `
    ${editButton}
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
      renderTable();
      updateBulkActionsBar();
    }

    // Group select checkbox
    if (target.hasAttribute('data-select-group')) {
      const checkbox = target as HTMLInputElement;
      const groupId = Number(checkbox.dataset.selectGroup);
      handleSelectGroup(groupId, checkbox.checked);
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
 * Handle select all redirects in a group
 */
function handleSelectGroup(groupId: number, checked: boolean): void {
  const groups = groupBySite(filteredRedirects);
  const group = groups.find(g => g.site_id === groupId);
  if (!group) return;

  const selectableDomains = group.domains.filter(d => !primaryDomains.has(d.domain));

  if (checked) {
    // Select all selectable domains in this group
    for (const redirect of selectableDomains) {
      selectedRedirects.add(redirect.id);
    }
  } else {
    // Deselect all domains in this group
    for (const redirect of selectableDomains) {
      selectedRedirects.delete(redirect.id);
    }
  }

  renderTable();
  updateBulkActionsBar();
}

/**
 * Handle select all redirects globally (all selectable domains on page)
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
  const confirmed = confirm(`Are you sure you want to delete ${count} redirect(s)?\n\nThis action cannot be undone.`);

  if (!confirmed) return;

  console.log('[Redirects] Bulk delete:', count, 'redirects');
  alert(`🗑️ Delete ${count} redirect(s)\n\n(API integration coming soon)`);
}
