/**
 * Bulk actions for domains table
 * Handles selection tracking and bulk operations
 */

import { showDialog, hideDialog } from '@ui/dialog';

/**
 * Initialize bulk actions bar
 */
export function initBulkActions(): void {
  const bulkBar = document.querySelector<HTMLElement>('[data-bulk-actions]');
  const table = document.querySelector<HTMLTableElement>('.table--domains');
  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-select-all]');

  if (!bulkBar || !table || !selectAllCheckbox) return;

  const countElement = bulkBar.querySelector<HTMLElement>('[data-selected-count]');
  const cancelBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-cancel]');
  const exportBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-export]');
  const deleteBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-delete]');

  /**
   * Get all row checkboxes (excluding "select all")
   */
  function getRowCheckboxes(): HTMLInputElement[] {
    return Array.from(table.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'));
  }

  /**
   * Update bulk actions bar visibility and count
   */
  function updateBulkBar(): void {
    const checkboxes = getRowCheckboxes();
    const selectedCount = checkboxes.filter(cb => cb.checked).length;

    if (selectedCount > 0) {
      bulkBar.hidden = false;
      if (countElement) {
        countElement.textContent = selectedCount.toString();
      }
    } else {
      bulkBar.hidden = true;
    }

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
