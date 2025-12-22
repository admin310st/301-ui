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
      <td>
        ${flowDisplay}
      </td>
      <td>
        ${conditionsDisplay}
      </td>
      <td>
        ${hitsDisplay}
      </td>
      <td>
        ${statusBadge}
      </td>
      <td>
        <div class="table-actions">
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

  // Build destinations list
  let destinationsList = '';
  if (rule.destinations.length === 1) {
    const url = rule.destinations[0].url.replace('https://', '').replace('http://', '');
    destinationsList = `<span class="redirect-flow__destination-url">${url}</span>`;
  } else {
    destinationsList = `
      <div class="redirect-flow__destination-list">
        ${rule.destinations.map(dest => {
          const url = dest.url.replace('https://', '').replace('http://', '');
          const weight = dest.weight ? `<span class="badge badge--sm badge--neutral">${dest.weight}%</span>` : '';
          return `
            <div class="redirect-flow__destination-item">
              <span class="redirect-flow__destination-url">${url}</span>
              ${weight}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return `
    <div class="redirect-flow">
      <!-- Vertical track line (CSS) -->
      <div class="redirect-flow__track">
        <!-- Source -->
        <div class="redirect-flow__node redirect-flow__node--source">
          <div class="redirect-flow__node-icon">
            <span class="icon" data-icon="mono/dns"></span>
          </div>
          <div class="redirect-flow__node-content">
            <div class="redirect-flow__node-label">Source</div>
            <div class="redirect-flow__node-data">
              <span class="redirect-flow__source-domain">${rule.source_domain}</span>
              <span class="redirect-flow__source-path">
                ${pathIcon}
                <code>${rule.source_path}</code>
              </span>
            </div>
          </div>
        </div>

        <!-- Rule -->
        <div class="redirect-flow__node redirect-flow__node--rule">
          <div class="redirect-flow__node-icon">
            <span class="icon" data-icon="mono/directions-fork"></span>
          </div>
          <div class="redirect-flow__node-content">
            <div class="redirect-flow__node-label">Rule</div>
            <div class="redirect-flow__node-data">
              <span class="redirect-flow__rule-name">${rule.name}</span>
              ${typeBadge}
              <span class="badge badge--sm badge--neutral">${rule.project_name}</span>
            </div>
          </div>
        </div>

        <!-- Destination -->
        <div class="redirect-flow__node redirect-flow__node--destination">
          <div class="redirect-flow__node-icon">
            <span class="icon" data-icon="mono/arrow-top-right"></span>
          </div>
          <div class="redirect-flow__node-content">
            <div class="redirect-flow__node-label">Destination</div>
            <div class="redirect-flow__node-data">
              ${destinationsList}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Get type badge for rule
 */
function getTypeBadge(rule: RedirectRule): string {
  const badges = {
    simple: `<span class="badge badge--sm badge--neutral">${rule.redirect_code}</span>`,
    weighted: '<span class="badge badge--sm badge--primary">Split</span>',
    conditional: '<span class="badge badge--sm badge--warning">Conditional</span>',
    regex: '<span class="badge badge--sm badge--info">Regex</span>',
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
    <div class="stack-list stack-list--xs text-sm">
      <div><strong>${formatNumber(rule.hits_24h)}</strong> <span class="text-muted">24h</span></div>
      <div><strong>${formatNumber(rule.hits_7d)}</strong> <span class="text-muted">7d</span></div>
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
  // Disabled rule - can enable
  if (rule.status === 'disabled') {
    return `
      <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit" data-rule-id="${rule.id}" title="Edit redirect">
        <span class="icon" data-icon="mono/pencil-circle"></span>
      </button>
      <button class="btn-icon btn-icon--sm btn-icon--success" type="button" data-action="enable" data-rule-id="${rule.id}" title="Enable rule">
        <span class="icon" data-icon="mono/arrow-up"></span>
      </button>
    `;
  }

  // Error state - needs attention
  if (rule.status === 'error') {
    return `
      <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit" data-rule-id="${rule.id}" title="Edit redirect">
        <span class="icon" data-icon="mono/pencil-circle"></span>
      </button>
      <button class="btn-icon btn-icon--sm btn-icon--danger" type="button" data-action="disable" data-rule-id="${rule.id}" title="Disable rule">
        <span class="icon" data-icon="mono/close"></span>
      </button>
    `;
  }

  // Active - normal edit/disable actions
  return `
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="edit" data-rule-id="${rule.id}" title="Edit redirect">
      <span class="icon" data-icon="mono/pencil-circle"></span>
    </button>
    <button class="btn-icon btn-icon--sm btn-icon--ghost" type="button" data-action="disable" data-rule-id="${rule.id}" title="Disable rule">
      <span class="icon" data-icon="mono/pause"></span>
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
 * Handle add redirect
 */
function handleAddRedirect(): void {
  console.log('[Redirects] Add redirect');
  alert('➕ Add new redirect rule\n\n(Wizard coming soon)');
}
