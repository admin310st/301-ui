/**
 * TDS page controller
 * Manages the TDS rules page: loading, table, search, filters, actions
 *
 * 4 visibility states: loading → error → empty → table
 */

import type { TdsRule } from '@api/types';
import {
  onStateChange,
  loadRules,
  refreshRules,
  removeRuleOptimistic,
} from './state';
import { getDefaultFilters, hasActiveFilters, type TdsActiveFilters } from './filters-config';
import { renderFilterBar, initFilterUI } from './filters-ui';
import { renderRulesTable } from './table';
import { deleteRule } from '@api/tds';
import { safeCall } from '@api/ui-client';
import { showGlobalNotice } from '@ui/globalNotice';
import { showDialog, hideDialog } from '@ui/dialog';
import { t } from '@i18n';

let allRules: TdsRule[] = [];
let filteredRules: TdsRule[] = [];
let activeFilters: TdsActiveFilters = getDefaultFilters();
let searchQuery = '';
let pendingDeleteRuleId: number | null = null;

/**
 * Initialize TDS page
 */
export function initTdsPage(): void {
  const card = document.querySelector('[data-tds-card]');
  if (!card) return;

  // Subscribe to state changes
  onStateChange(state => {
    if (state.loading) {
      showLoadingState();
    } else if (state.error) {
      showErrorState(state.error);
    } else if (state.rules.length === 0) {
      showEmptyState();
    } else {
      allRules = [...state.rules].sort((a, b) => a.priority - b.priority);
      applyFiltersAndSearch();
      showTableState();
    }
  });

  setupSearch();
  setupFilters();
  setupActions();
  setupGlobalDropdowns();

  // Load data
  void loadRules();
}

// =============================================================================
// Visibility States
// =============================================================================

function showLoadingState(): void {
  toggleElement('[data-loading-state]', true);
  toggleElement('[data-empty-state]', false);
  toggleElement('[data-table-shell]', false);
  toggleElement('[data-error-state]', false);
  toggleElement('[data-welcome-card]', false);
}

function showErrorState(message: string): void {
  toggleElement('[data-loading-state]', false);
  toggleElement('[data-empty-state]', false);
  toggleElement('[data-table-shell]', false);
  toggleElement('[data-welcome-card]', false);
  toggleElement('[data-error-state]', true);

  const errorMsg = document.querySelector('[data-error-message]');
  if (errorMsg) errorMsg.textContent = message;
}

function showEmptyState(): void {
  toggleElement('[data-loading-state]', false);
  toggleElement('[data-error-state]', false);
  toggleElement('[data-table-shell]', false);
  toggleElement('[data-welcome-card]', true);
  toggleElement('[data-empty-state]', false);
}

function showTableState(): void {
  toggleElement('[data-loading-state]', false);
  toggleElement('[data-error-state]', false);
  toggleElement('[data-welcome-card]', false);
  toggleElement('[data-table-shell]', true);

  // If filters reduce to 0, show empty-state within the card
  if (filteredRules.length === 0 && (searchQuery || hasActiveFilters(activeFilters))) {
    toggleElement('[data-empty-state]', true);
    toggleElement('[data-table-shell]', false);
  } else {
    toggleElement('[data-empty-state]', false);
  }

  renderTable();
}

function toggleElement(selector: string, show: boolean): void {
  const el = document.querySelector(selector);
  if (el) (el as HTMLElement).hidden = !show;
}

// =============================================================================
// Table Rendering
// =============================================================================

function renderTable(): void {
  const tbody = document.querySelector('[data-tds-tbody]');
  if (!tbody) return;

  tbody.innerHTML = renderRulesTable(filteredRules);

  // Update counts
  const shownCount = document.querySelector('[data-shown-count]');
  const totalCount = document.querySelector('[data-total-count]');
  if (shownCount) shownCount.textContent = String(filteredRules.length);
  if (totalCount) totalCount.textContent = String(allRules.length);
}

// =============================================================================
// Search
// =============================================================================

function setupSearch(): void {
  const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
  const searchClear = document.querySelector('[data-search-clear]') as HTMLButtonElement;
  const tableSearch = document.querySelector('[data-table-search]') as HTMLElement;

  if (!searchInput) return;

  searchInput.addEventListener('input', e => {
    searchQuery = (e.target as HTMLInputElement).value.toLowerCase().trim();

    if (tableSearch) {
      tableSearch.classList.toggle('table-search--active', searchQuery.length > 0);
    }

    applyFiltersAndSearch();
    showTableState();
  });

  if (searchClear && searchInput && tableSearch) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      tableSearch.classList.remove('table-search--active');
      applyFiltersAndSearch();
      showTableState();
      searchInput.focus();
    });
  }
}

// =============================================================================
// Filters
// =============================================================================

function setupFilters(): void {
  const filterBar = document.querySelector('[data-filter-bar]');
  if (!filterBar) return;

  const resetBtn = document.querySelector('[data-reset-filters]');

  const updateResetButton = () => {
    if (resetBtn) {
      resetBtn.classList.toggle('is-active', hasActiveFilters(activeFilters));
    }
  };

  const handleFilterChange = (updatedFilters: TdsActiveFilters) => {
    activeFilters = updatedFilters;
    applyFiltersAndSearch();
    filterBar.innerHTML = renderFilterBar(activeFilters);
    updateResetButton();
    showTableState();
  };

  filterBar.innerHTML = renderFilterBar(activeFilters);
  initFilterUI(filterBar as HTMLElement, activeFilters, handleFilterChange);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeFilters = getDefaultFilters();
      handleFilterChange(activeFilters);
    });
  }

  updateResetButton();
}

function applyFiltersAndSearch(): void {
  let result = [...allRules];

  // Apply type filter
  if (activeFilters.tds_type && activeFilters.tds_type.length > 0) {
    result = result.filter(r => activeFilters.tds_type!.includes(r.tds_type));
  }

  // Apply status filter
  if (activeFilters.status && activeFilters.status.length > 0) {
    result = result.filter(r => activeFilters.status!.includes(r.status));
  }

  // Apply action filter
  if (activeFilters.action && activeFilters.action.length > 0) {
    result = result.filter(r => activeFilters.action!.includes(r.logic_json.action));
  }

  // Apply search
  if (searchQuery) {
    result = result.filter(rule =>
      rule.rule_name.toLowerCase().includes(searchQuery) ||
      (rule.logic_json.action_url && rule.logic_json.action_url.toLowerCase().includes(searchQuery))
    );
  }

  filteredRules = result;
}

// =============================================================================
// Actions
// =============================================================================

function setupActions(): void {
  const card = document.querySelector('[data-tds-card]');
  if (!card) return;

  card.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    if (!button) return;

    const action = button.dataset.action;
    const ruleId = button.dataset.ruleId ? Number(button.dataset.ruleId) : null;

    switch (action) {
      case 'edit-rule':
        if (ruleId) handleEditRule(ruleId);
        break;
      case 'delete-rule':
        if (ruleId) handleDeleteRule(ruleId);
        break;
      case 'retry':
        void refreshRules();
        break;
    }
  });

  // Row click → edit (clicking the <tr>)
  const tbody = document.querySelector('[data-tds-tbody]');
  if (tbody) {
    tbody.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      // Don't open drawer for button/dropdown clicks
      if (target.closest('button') || target.closest('.dropdown')) return;

      const row = target.closest('tr[data-rule-id]') as HTMLElement;
      if (row) {
        const ruleId = Number(row.dataset.ruleId);
        if (ruleId) handleEditRule(ruleId);
      }
    });
  }

  // Create Rule button
  const createBtn = document.querySelector('[data-action="create-rule"]');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      // Will be wired in Phase 3 (drawer)
      const event = new CustomEvent('tds:open-create-drawer');
      document.dispatchEvent(event);
    });
  }

  // Delete confirmation
  const confirmDeleteBtn = document.querySelector('[data-confirm-delete-tds]');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      void confirmDeleteRule();
    });
  }
}

function handleEditRule(ruleId: number): void {
  const event = new CustomEvent('tds:open-edit-drawer', { detail: { ruleId } });
  document.dispatchEvent(event);
}

function handleDeleteRule(ruleId: number): void {
  pendingDeleteRuleId = ruleId;
  const rule = allRules.find(r => r.id === ruleId);

  const nameEl = document.querySelector('[data-delete-rule-name]');
  if (nameEl && rule) nameEl.textContent = rule.rule_name;

  showDialog('delete-tds-rule');
}

async function confirmDeleteRule(): Promise<void> {
  if (pendingDeleteRuleId === null) return;

  const ruleId = pendingDeleteRuleId;
  pendingDeleteRuleId = null;
  hideDialog('delete-tds-rule');

  try {
    removeRuleOptimistic(ruleId);

    await safeCall(
      () => deleteRule(ruleId),
      { lockKey: `tds-rule:delete:${ruleId}`, retryOn401: true }
    );

    showGlobalNotice('success', t('streams.messages.deleted'));
  } catch (error: any) {
    await refreshRules();
    showGlobalNotice('error', error.message || t('streams.messages.deleteFailed'));
  }
}

// =============================================================================
// Global Dropdowns
// =============================================================================

function setupGlobalDropdowns(): void {
  document.addEventListener('click', e => {
    const target = e.target as HTMLElement;

    // Handle dropdown triggers in table
    const trigger = target.closest('.dropdown__trigger');
    if (trigger) {
      const dropdown = trigger.closest('.dropdown') || trigger.closest('[data-dropdown]');
      if (!dropdown) return;

      // Only handle dropdowns inside our card
      const card = document.querySelector('[data-tds-card]');
      if (!card?.contains(dropdown as Node)) return;

      e.preventDefault();
      e.stopPropagation();

      const isOpen = dropdown.classList.contains('dropdown--open');

      // Close all other dropdowns in the card
      card.querySelectorAll('.dropdown--open').forEach(other => {
        if (other !== dropdown) {
          other.classList.remove('dropdown--open');
          const otherTrigger = other.querySelector('.dropdown__trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        }
      });

      if (isOpen) {
        dropdown.classList.remove('dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        dropdown.classList.add('dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    // Click outside — close all table dropdowns
    const card = document.querySelector('[data-tds-card]');
    if (card && !target.closest('.dropdown') && !target.closest('[data-dropdown]')) {
      card.querySelectorAll('.dropdown--open').forEach(dropdown => {
        dropdown.classList.remove('dropdown--open');
        const ddTrigger = dropdown.querySelector('.dropdown__trigger');
        if (ddTrigger) ddTrigger.setAttribute('aria-expanded', 'false');
      });
    }
  });
}
