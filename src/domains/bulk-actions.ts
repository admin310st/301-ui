/**
 * Bulk actions for domains table
 * Handles selection tracking and bulk operations
 */

import { showDialog, hideDialog } from '@ui/dialog';
import { updateBulkActionsBar } from '@ui/bulk-actions';
import { getProjects } from '@api/projects';
import { moveDomainToProject } from '@api/domains';
import { getAuthState } from '@state/auth-state';
import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';

/**
 * Initialize bulk actions bar
 */
export function initBulkActions(): void {
  const bulkBar = document.querySelector<HTMLElement>('[data-bulk-actions]');
  const table = document.querySelector<HTMLTableElement>('.table--domains');
  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-select-all]');

  if (!bulkBar || !table || !selectAllCheckbox) return;

  const cancelBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-cancel]');
  const exportBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-export]');
  const deleteBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-delete]');
  const moveBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-move]');

  /**
   * Get all row checkboxes (excluding "select all")
   */
  function getRowCheckboxes(): HTMLInputElement[] {
    return Array.from(table.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'));
  }

  /**
   * Update bulk actions bar visibility and count using shared utility
   */
  function updateBulkBar(): void {
    const checkboxes = getRowCheckboxes();
    const selectedCount = checkboxes.filter(cb => cb.checked).length;

    // Use shared bulk actions utility
    updateBulkActionsBar(selectedCount, {
      bulkBarSelector: '[data-bulk-actions]',
      countSelector: '[data-selected-count]',
    });

    // Update "select all" checkbox state
    if (checkboxes.length > 0) {
      const allChecked = checkboxes.every(cb => cb.checked);
      const someChecked = checkboxes.some(cb => cb.checked);
      selectAllCheckbox.checked = allChecked;
      selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }
  }

  /**
   * Handle "select all" checkbox change
   */
  selectAllCheckbox.addEventListener('change', () => {
    const checkboxes = getRowCheckboxes();
    checkboxes.forEach(cb => {
      cb.checked = selectAllCheckbox.checked;
    });
    updateBulkBar();
  });

  /**
   * Handle individual row checkbox changes
   * Use event delegation on table body
   */
  table.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
      updateBulkBar();
    }
  });

  /**
   * Handle Cancel button - clear all selections
   */
  cancelBtn?.addEventListener('click', () => {
    const checkboxes = getRowCheckboxes();
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    updateBulkBar();
  });

  /**
   * Handle Export button
   */
  exportBtn?.addEventListener('click', () => {
    const checkboxes = getRowCheckboxes();
    const selectedIds = checkboxes
      .filter(cb => cb.checked)
      .map(cb => cb.closest('tr')?.dataset.domainId)
      .filter(Boolean);

    console.log('Export domains:', selectedIds);
    // TODO: Implement export logic (CSV, JSON, etc.)
  });

  /**
   * Handle Move to Project button - show project selection dialog
   */
  moveBtn?.addEventListener('click', async () => {
    const selectedIds = getSelectedDomainIds();
    if (selectedIds.length === 0) return;

    // Update count in dialog
    const countElement = document.querySelector('[data-bulk-move-count]');
    if (countElement) {
      countElement.textContent = selectedIds.length.toString();
    }

    // Load projects and populate dropdown
    await loadProjectsForMoveDialog();

    // Show dialog
    showDialog('bulk-move-domains');
  });

  /**
   * Handle project selection in move dialog
   */
  const projectSelect = document.querySelector<HTMLSelectElement>('[data-bulk-move-project-select]');
  const confirmMoveBtn = document.querySelector<HTMLButtonElement>('[data-confirm-bulk-move]');

  projectSelect?.addEventListener('change', () => {
    if (confirmMoveBtn) {
      confirmMoveBtn.disabled = !projectSelect.value;
    }
  });

  /**
   * Handle bulk move confirmation
   */
  confirmMoveBtn?.addEventListener('click', async () => {
    const selectedIds = getSelectedDomainIds();
    const projectId = projectSelect?.value;

    if (!projectId || selectedIds.length === 0) {
      hideDialog('bulk-move-domains');
      return;
    }

    try {
      const { accountId } = getAuthState();
      if (!accountId) {
        showGlobalMessage('error', 'Account ID not found');
        return;
      }

      // Move each domain to the new project
      await Promise.all(
        selectedIds.map((domainIdStr) => {
          const domainId = Number(domainIdStr);
          return moveDomainToProject(accountId, domainId, Number(projectId));
        })
      );

      // Show success message
      showGlobalMessage('success', `Moved ${selectedIds.length} domain(s) to project`);

      // Close dialog and clear selections
      hideDialog('bulk-move-domains');
      clearSelection();

      // Reset dropdown
      if (projectSelect) projectSelect.value = '';
      if (confirmMoveBtn) confirmMoveBtn.disabled = true;

      // Reload domains (when implemented with real API)
      // window.location.reload();
    } catch (error) {
      console.error('Failed to move domains:', error);
      showGlobalMessage('error', 'Failed to move domains to project');
    }
  });

  // TODO: Implement bulk action handlers for:
  // - data-bulk-edit (Change Status) - Open dialog to change domain status (active/parked/etc)
  // - data-bulk-monitoring (Toggle Monitoring) - Enable/disable monitoring for selected acceptor domains
  // - data-bulk-sync (Sync Registrar) - Trigger registrar sync for selected domains

  /**
   * Handle Delete button - show confirmation dialog
   */
  deleteBtn?.addEventListener('click', () => {
    const checkboxes = getRowCheckboxes();
    const selectedIds = checkboxes
      .filter(cb => cb.checked)
      .map(cb => cb.closest('tr')?.dataset.domainId)
      .filter(Boolean);

    if (selectedIds.length === 0) return;

    // Update count in dialog
    const countElement = document.querySelector('[data-bulk-delete-count]');
    if (countElement) {
      countElement.textContent = selectedIds.length.toString();
    }

    // Show confirmation dialog
    showDialog('bulk-delete-domains');
  });

  /**
   * Handle bulk delete confirmation
   */
  const confirmBulkDeleteBtn = document.querySelector('[data-confirm-bulk-delete]');
  confirmBulkDeleteBtn?.addEventListener('click', () => {
    const selectedIds = getSelectedDomainIds();

    if (selectedIds.length === 0) {
      hideDialog('bulk-delete-domains');
      return;
    }

    console.log('Delete domains:', selectedIds);
    // TODO: Implement actual delete API call

    // Close dialog and clear selections
    hideDialog('bulk-delete-domains');
    clearSelection();

    // Show success notification (when implemented)
    console.log(`Successfully deleted ${selectedIds.length} domains`);
  });

  // Initial state
  updateBulkBar();
}

/**
 * Get selected domain IDs
 */
export function getSelectedDomainIds(): string[] {
  const table = document.querySelector<HTMLTableElement>('.table--domains');
  if (!table) return [];

  const checkboxes = Array.from(table.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'));
  return checkboxes
    .filter(cb => cb.checked)
    .map(cb => cb.closest('tr')?.dataset.domainId)
    .filter(Boolean) as string[];
}

/**
 * Clear all selections
 */
export function clearSelection(): void {
  const table = document.querySelector<HTMLTableElement>('.table--domains');
  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-select-all]');

  if (!table) return;

  const checkboxes = Array.from(table.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'));
  checkboxes.forEach(cb => {
    cb.checked = false;
  });

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  }

  // Hide bulk bar
  const bulkBar = document.querySelector<HTMLElement>('[data-bulk-actions]');
  if (bulkBar) {
    bulkBar.hidden = true;
  }
}

/**
 * Load projects and populate move dialog dropdown
 */
async function loadProjectsForMoveDialog(): Promise<void> {
  const select = document.querySelector<HTMLSelectElement>('[data-bulk-move-project-select]');
  if (!select) return;

  const { accountId } = getAuthState();
  if (!accountId) {
    console.error('Account ID not found');
    return;
  }

  try {
    const projects = await getProjects(accountId);

    // Clear existing options (except the placeholder)
    const placeholder = select.querySelector('option[disabled]');
    select.innerHTML = '';
    if (placeholder) select.appendChild(placeholder);

    // Add project options
    projects.forEach((project) => {
      const option = document.createElement('option');
      option.value = String(project.id);
      option.textContent = project.project_name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load projects:', error);
    showGlobalMessage('error', 'Failed to load projects');
  }
}
