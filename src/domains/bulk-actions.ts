/**
 * Bulk actions for domains table
 * Handles selection tracking and bulk operations
 */

import { showDialog, hideDialog } from '@ui/dialog';
import { updateBulkActionsBar } from '@ui/bulk-actions';
import { showGlobalMessage } from '@ui/notifications';
import { updateDomainRole, blockDomain, deleteDomain } from '@api/domains';
import { safeCall } from '@api/ui-client';
import type { DomainRole } from '@api/types';

// Callback to reload domains after bulk operations
let reloadDomainsCallback: (() => Promise<void>) | null = null;

/**
 * Set the callback function to reload domains after bulk operations
 */
export function setReloadDomainsCallback(callback: () => Promise<void>): void {
  reloadDomainsCallback = callback;
}

/**
 * Trigger domains reload
 */
async function reloadDomains(): Promise<void> {
  if (reloadDomainsCallback) {
    await reloadDomainsCallback();
  }
}

/**
 * Initialize bulk actions bar
 */
export function initBulkActions(): void {
  const bulkBar = document.querySelector<HTMLElement>('[data-bulk-actions]');
  const table = document.querySelector<HTMLTableElement>('.table--domains');
  const selectAllCheckbox = document.querySelector<HTMLInputElement>('[data-select-all]');

  if (!bulkBar || !table || !selectAllCheckbox) return;

  const cancelBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-cancel]');
  const deleteBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-delete]');
  const roleBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-role]');
  const moveBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-move]');
  const blockBtn = bulkBar.querySelector<HTMLButtonElement>('[data-bulk-block]');

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
   * Handle Change Role button
   * Sequential PATCH /domains/:id { role } for each domain
   */
  roleBtn?.addEventListener('click', async () => {
    const selectedIds = getSelectedDomainIds();
    if (selectedIds.length === 0) return;

    const newRole = prompt(
      `Change role for ${selectedIds.length} domain(s)?\n\nEnter new role: acceptor, donor, or reserve`
    );
    if (!newRole || !['acceptor', 'donor', 'reserve'].includes(newRole)) return;

    let successCount = 0;
    let errorCount = 0;

    // Process sequentially
    for (const idStr of selectedIds) {
      const domainId = parseInt(idStr);
      try {
        await safeCall(
          () => updateDomainRole(domainId, newRole as DomainRole),
          { lockKey: `bulk-role-${domainId}`, retryOn401: true }
        );
        successCount++;
      } catch (error) {
        console.error(`Failed to change role for domain ${domainId}:`, error);
        errorCount++;
      }
    }

    // Show result
    if (errorCount === 0) {
      showGlobalMessage('success', `Changed role to ${newRole} for ${successCount} domain(s)`);
    } else {
      showGlobalMessage('warning', `Changed ${successCount} domain(s), ${errorCount} failed`);
    }

    clearSelection();
    await reloadDomains();
  });

  /**
   * Handle Assign to Site button
   * TODO: Requires site selection dialog
   */
  moveBtn?.addEventListener('click', () => {
    const selectedIds = getSelectedDomainIds();
    if (selectedIds.length === 0) return;

    showGlobalMessage('info', 'Site assignment requires selecting a target site first');
    // TODO: Open site selection dialog
  });

  /**
   * Handle Block button
   * Sequential PATCH /domains/:id { blocked: true } for each domain
   */
  blockBtn?.addEventListener('click', async () => {
    const selectedIds = getSelectedDomainIds();
    if (selectedIds.length === 0) return;

    const reason = prompt(
      `Block ${selectedIds.length} domain(s)?\n\nEnter reason (optional):`
    );
    if (reason === null) return; // User cancelled

    let successCount = 0;
    let errorCount = 0;

    // Process sequentially
    for (const idStr of selectedIds) {
      const domainId = parseInt(idStr);
      try {
        await safeCall(
          () => blockDomain(domainId, reason || 'manual'),
          { lockKey: `bulk-block-${domainId}`, retryOn401: true }
        );
        successCount++;
      } catch (error) {
        console.error(`Failed to block domain ${domainId}:`, error);
        errorCount++;
      }
    }

    // Show result
    if (errorCount === 0) {
      showGlobalMessage('success', `Blocked ${successCount} domain(s)`);
    } else {
      showGlobalMessage('warning', `Blocked ${successCount} domain(s), ${errorCount} failed`);
    }

    clearSelection();
    await reloadDomains();
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
   * NOTE: Only subdomains (3rd+ level) can be deleted via API.
   * Root domains are managed by zones.
   * Sequential DELETE /domains/:id for safety
   */
  const confirmBulkDeleteBtn = document.querySelector('[data-confirm-bulk-delete]');
  confirmBulkDeleteBtn?.addEventListener('click', async () => {
    const selectedIds = getSelectedDomainIds();

    if (selectedIds.length === 0) {
      hideDialog('bulk-delete-domains');
      return;
    }

    hideDialog('bulk-delete-domains');

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process sequentially (safer for deletion)
    for (const idStr of selectedIds) {
      const domainId = parseInt(idStr);
      try {
        await safeCall(
          () => deleteDomain(domainId),
          { lockKey: `bulk-delete-${domainId}`, retryOn401: true }
        );
        successCount++;
      } catch (error: unknown) {
        console.error(`Failed to delete domain ${domainId}:`, error);
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (errorMsg.includes('root domain') || errorMsg.includes('cannot be deleted')) {
          errors.push(`Domain ${domainId}: Only subdomains can be deleted`);
        }
      }
    }

    // Show result
    if (errorCount === 0) {
      showGlobalMessage('success', `Deleted ${successCount} subdomain(s)`);
    } else if (successCount === 0) {
      showGlobalMessage('error', `Failed to delete domains. ${errors[0] || 'Unknown error'}`);
    } else {
      showGlobalMessage('warning', `Deleted ${successCount} subdomain(s), ${errorCount} failed`);
    }

    clearSelection();
    await reloadDomains();
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

