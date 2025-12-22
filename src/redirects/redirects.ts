/**
 * Redirects page UI logic
 *
 * Traffic Control Plane routing rules management
 */

import { mockRedirectRules, getRedirectStats, type RedirectRule } from './mock-data';

let currentRules: RedirectRule[] = [];
let filteredRules: RedirectRule[] = [];

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

  // Setup action buttons
  setupActions();
}

/**
 * Load redirect rules (mock data for now)
 */
function loadRedirects(): void {
  const loadingState = document.querySelector('[data-loading-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const tableShell = document.querySelector('[data-table-shell]');
  const footer = document.querySelector('[data-table-footer]');

  if (loadingState) loadingState.hidden = false;

  // Simulate loading
  setTimeout(() => {
    currentRules = [...mockRedirectRules];
    filteredRules = [...currentRules];

    if (loadingState) loadingState.hidden = true;

    if (currentRules.length === 0) {
      if (emptyState) emptyState.hidden = false;
    } else {
      renderStats();
      renderTable();
      if (tableShell) tableShell.hidden = false;
      if (footer) footer.hidden = false;
    }
  }, 300);
}

/**
 * Render stats cards
 */
function renderStats(): void {
  const stats = getRedirectStats(currentRules);
  const statsGrid = document.querySelector('[data-stats-grid]');
  if (!statsGrid) return;

  // Update each stat
  Object.entries(stats).forEach(([key, value]) => {
    const element = statsGrid.querySelector(`[data-stat="${key}"]`);
    if (element) {
      element.textContent = formatNumber(value);
    }
  });
}

/**
 * Format number with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(num);
}

/**
 * Render redirects table
 */
function renderTable(): void {
  const tbody = document.querySelector('[data-redirects-tbody]');
  if (!tbody) return;

  tbody.innerHTML = filteredRules.map(rule => renderRuleRow(rule)).join('');

  // Update counts
  const shownCount = document.querySelector('[data-shown-count]');
  const totalCount = document.querySelector('[data-total-count]');
  if (shownCount) shownCount.textContent = String(filteredRules.length);
  if (totalCount) totalCount.textContent = String(currentRules.length);
}

/**
 * Render single rule row with flow visualization
 */
function renderRuleRow(rule: RedirectRule): string {
  const flowDisplay = getFlowDisplay(rule);
  const conditionsDisplay = getConditionsDisplay(rule);
  const hitsDisplay = getHitsDisplay(rule);
  const statusBadge = getStatusBadge(rule);
  const actions = getRowActions(rule);

  return `
    <tr data-rule-id="${rule.id}">
      <td class="table__cell-flow">
        ${flowDisplay}
      </td>
      <td class="table__cell-conditions">
        ${conditionsDisplay}
      </td>
      <td class="table__cell-hits">
        ${hitsDisplay}
      </td>
      <td class="table__cell-status">
        ${statusBadge}
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
 * Get flow display: Source → Rule → Destinations
 */
function getFlowDisplay(rule: RedirectRule): string {
  const typeBadge = getTypeBadge(rule);
  const pathIcon = rule.source_path_type === 'regex'
    ? '<span class="icon" data-icon="mono/alert-triangle" title="Regex"></span>'
    : rule.source_path_type === 'prefix'
    ? '<span class="icon" data-icon="mono/target" title="Prefix match"></span>'
    : '';

  const destinationsList = getDestinationsList(rule);
  const destinationTitle = rule.destinations.length > 1 ? 'Destinations' : 'Destination';

  return `
    <div class="redirect-flow">
      <div class="redirect-flow__segment redirect-flow__segment--source">
        <div class="redirect-flow__segment-body">
          <div class="redirect-flow__segment-header">
            <span class="redirect-flow__pill">Src</span>
            <div class="redirect-flow__title">${rule.source_domain}</div>
          </div>
          <div class="redirect-flow__meta">
            ${pathIcon}
            <span class="redirect-flow__path">${rule.source_path}</span>
          </div>
        </div>
      </div>

      <button class="redirect-flow__segment redirect-flow__segment--rule" type="button" data-action="edit" data-rule-id="${rule.id}" aria-label="Edit redirect rule ${rule.name}">
        <div class="redirect-flow__segment-body">
          <div class="redirect-flow__segment-header">
            <span class="redirect-flow__pill redirect-flow__pill--rule">Rule</span>
            <div class="redirect-flow__title redirect-flow__title--strong">${rule.name}</div>
          </div>
          <div class="redirect-flow__meta">
            ${typeBadge}
            <span class="badge badge--sm badge--neutral">${rule.project_name}</span>
          </div>
        </div>
        <span class="redirect-flow__cta">
          <span class="icon" data-icon="mono/pencil-circle"></span>
        </span>
      </button>

      <div class="redirect-flow__segment redirect-flow__segment--destination">
        <div class="redirect-flow__segment-body">
          <div class="redirect-flow__segment-header">
            <span class="redirect-flow__pill redirect-flow__pill--destination">Dst</span>
            <div class="redirect-flow__title">${destinationTitle}</div>
          </div>
          <div class="redirect-flow__destinations">
            ${destinationsList}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Format destinations list with weights and overflow handling
 */
function getDestinationsList(rule: RedirectRule): string {
  const maxVisible = 3;
  const destinations = rule.destinations.map(dest => ({
    label: dest.url.replace('https://', '').replace('http://', ''),
    weight: dest.weight,
  }));

  const visibleDestinations = destinations.slice(0, maxVisible);
  const remaining = destinations.length - visibleDestinations.length;

  const destinationItems = visibleDestinations.map(dest => `
    <div class="redirect-flow__destination-item">
      <span class="redirect-flow__destination-url">${dest.label}</span>
      ${dest.weight ? `<span class="redirect-flow__destination-weight">${dest.weight}%</span>` : ''}
    </div>
  `).join('');

  const overflow = remaining > 0
    ? `<div class="redirect-flow__destination-more">+${remaining} more</div>`
    : '';

  return `
    <div class="redirect-flow__destination-list">
      ${destinationItems}
      ${overflow}
    </div>
  `;
}

/**
 * Get type badge for rule
 */
function getTypeBadge(rule: RedirectRule): string {
  const badges = {
    simple: `<span class="badge badge--sm ${rule.redirect_code === 301 ? 'badge--success' : 'badge--warning'}">${rule.redirect_code}</span>`,
    weighted: '<span class="badge badge--sm badge--primary">Split</span>',
    conditional: '<span class="badge badge--sm badge--warning">Conditional</span>',
    regex: '<span class="badge badge--sm badge--neutral">Regex</span>',
  };
  return badges[rule.type];
}

/**
 * Get conditions display (chips with icons)
 */
function getConditionsDisplay(rule: RedirectRule): string {
  const chips: string[] = [];

  // Countries
  if (rule.conditions.countries && rule.conditions.countries.length > 0) {
    chips.push(`
      <span class="condition-chip" title="${rule.conditions.countries.join(', ')}">
        <span class="icon" data-icon="mono/target"></span>
        <span>${rule.conditions.countries.length}</span>
      </span>
    `);
  }

  // Devices
  if (rule.conditions.devices && rule.conditions.devices.length > 0) {
    chips.push(`
      <span class="condition-chip" title="${rule.conditions.devices.join(', ')}">
        <span class="icon" data-icon="mono/layers"></span>
        <span>${rule.conditions.devices.length}</span>
      </span>
    `);
  }

  // Browsers
  if (rule.conditions.browsers && rule.conditions.browsers.length > 0) {
    chips.push(`
      <span class="condition-chip" title="${rule.conditions.browsers.join(', ')}">
        <span class="icon" data-icon="mono/open-in-new"></span>
        <span>${rule.conditions.browsers.length}</span>
      </span>
    `);
  }

  // Query params
  if (rule.conditions.query_params && Object.keys(rule.conditions.query_params).length > 0) {
    const count = Object.keys(rule.conditions.query_params).length;
    chips.push(`
      <span class="condition-chip" title="Query params">
        <span class="icon" data-icon="mono/filter"></span>
        <span>${count}</span>
      </span>
    `);
  }

  // Headers
  if (rule.conditions.headers && Object.keys(rule.conditions.headers).length > 0) {
    const count = Object.keys(rule.conditions.headers).length;
    chips.push(`
      <span class="condition-chip" title="Header conditions">
        <span class="icon" data-icon="mono/alert-triangle"></span>
        <span>${count}</span>
      </span>
    `);
  }

  if (chips.length === 0) {
    return '<span class="text-muted">—</span>';
  }

  return `<div class="stack-inline stack-inline--xs">${chips.join('')}</div>`;
}

/**
 * Get hits display
 */
function getHitsDisplay(rule: RedirectRule): string {
  return `
    <div class="table-metric">
      <div class="table-metric__row">
        <span class="table-metric__value">${formatNumber(rule.hits_24h)}</span>
        <span class="table-metric__label">24h</span>
      </div>
      <div class="table-metric__row table-metric__row--muted">
        <span class="table-metric__value">${formatNumber(rule.hits_7d)}</span>
        <span class="table-metric__label">7d</span>
      </div>
    </div>
  `;
}

/**
 * Get status badge
 */
function getStatusBadge(rule: RedirectRule): string {
  if (rule.status === 'active') {
    return '<span class="badge badge--success">Active</span>';
  }

  if (rule.status === 'disabled') {
    return '<span class="badge badge--neutral">Disabled</span>';
  }

  if (rule.status === 'error') {
    return `
      <span class="badge badge--danger">Error</span>
      ${rule.error_message ? `<div class="text-sm text-muted">${rule.error_message}</div>` : ''}
    `;
  }

  return '<span class="badge badge--neutral">Unknown</span>';
}

/**
 * Get row actions based on rule status
 */
function getRowActions(rule: RedirectRule): string {
  const isDisabled = rule.status === 'disabled';
  const toggleAction = isDisabled ? 'enable' : 'disable';
  const toggleIcon = isDisabled ? 'mono/arrow-up' : 'mono/pause';
  const toggleTitle = isDisabled ? 'Enable rule' : 'Disable rule';
  const toggleClass = isDisabled ? 'btn-icon--neutral' : 'btn-icon--ghost';

  return `
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="refresh" data-rule-id="${rule.id}" title="Re-run checks">
      <span class="icon" data-icon="mono/refresh"></span>
    </button>
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit" data-rule-id="${rule.id}" title="Edit redirect">
      <span class="icon" data-icon="mono/pencil-circle"></span>
    </button>
    <button class="btn-icon btn-icon--sm ${toggleClass}" type="button" data-action="${toggleAction}" data-rule-id="${rule.id}" title="${toggleTitle}">
      <span class="icon" data-icon="${toggleIcon}"></span>
    </button>
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="more" data-rule-id="${rule.id}" title="More actions">
      <span class="icon" data-icon="mono/dots-vertical"></span>
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
      filteredRules = [...currentRules];
    } else {
      filteredRules = currentRules.filter(rule =>
        rule.name.toLowerCase().includes(query) ||
        rule.source_domain.toLowerCase().includes(query) ||
        rule.project_name.toLowerCase().includes(query) ||
        rule.destinations.some(d => d.url.toLowerCase().includes(query))
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

  // Delegate events
  card.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    if (!button) return;

    const action = button.dataset.action;
    const ruleId = button.dataset.ruleId ? Number(button.dataset.ruleId) : null;

    console.log('[Redirects] Action:', action, 'Rule ID:', ruleId);

    switch (action) {
      case 'edit':
        if (ruleId) handleEdit(ruleId);
        break;
      case 'enable':
        if (ruleId) handleEnable(ruleId);
        break;
      case 'disable':
        if (ruleId) handleDisable(ruleId);
        break;
      case 'refresh':
        if (ruleId) handleRefresh(ruleId);
        break;
      case 'more':
        if (ruleId) handleMore(ruleId);
        break;
      case 'add-redirect':
        handleAddRedirect();
        break;
      case 'retry':
        loadRedirects();
        break;
    }
  });
}

/**
 * Handle edit rule
 */
function handleEdit(ruleId: number): void {
  const rule = currentRules.find(r => r.id === ruleId);
  if (!rule) return;

  console.log('[Redirects] Edit rule:', rule.name);
  alert(`✏️ Edit "${rule.name}"\n\nType: ${rule.type}\nSource: ${rule.source_domain}${rule.source_path}\n\n(Drawer UI coming soon)`);
}

/**
 * Handle enable rule
 */
function handleEnable(ruleId: number): void {
  const rule = currentRules.find(r => r.id === ruleId);
  if (!rule) return;

  console.log('[Redirects] Enable rule:', rule.name);
  alert(`▶️ Enable "${rule.name}"\n\n(API integration coming soon)`);
}

/**
 * Handle disable rule
 */
function handleDisable(ruleId: number): void {
  const rule = currentRules.find(r => r.id === ruleId);
  if (!rule) return;

  console.log('[Redirects] Disable rule:', rule.name);
  alert(`⏸️ Disable "${rule.name}"\n\n(API integration coming soon)`);
}

/**
 * Handle refresh check
 * TODO: Integrate with API to refresh health checks and analytics data
 */
function handleRefresh(ruleId: number): void {
  const rule = currentRules.find(r => r.id === ruleId);
  if (!rule) return;

  console.log('[Redirects] Refresh checks for rule:', rule.name);
  alert(`🔁 Re-running checks for "${rule.name}"\n\n(Health checks and analytics refresh coming soon)`);
}

/**
 * Handle contextual menu
 * TODO: Implement context menu with actions: manage, enable/disable, clone, delete, export
 */
function handleMore(ruleId: number): void {
  const rule = currentRules.find(r => r.id === ruleId);
  if (!rule) return;

  console.log('[Redirects] Open more actions for rule:', rule.name);
  alert(`⋯ Context menu for "${rule.name}"\n\nPlanned actions: manage, enable/disable, clone, delete, export.`);
}

/**
 * Handle add redirect
 */
function handleAddRedirect(): void {
  console.log('[Redirects] Add redirect');
  alert('➕ Add new redirect rule\n\n(Wizard coming soon)');
}
