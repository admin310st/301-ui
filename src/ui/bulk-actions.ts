/**
 * Shared bulk actions utilities
 * Provides consistent behavior for bulk selection across tables
 */

export interface BulkActionsOptions {
  /** Selector for the bulk actions bar container */
  bulkBarSelector: string;
  /** Selector for the counter element */
  countSelector: string;
  /** Selector for the cancel/clear button */
  cancelSelector?: string;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
}

/**
 * Update bulk actions bar visibility and counter
 * @param count Number of selected items
 * @param options Configuration options
 */
export function updateBulkActionsBar(count: number, options: BulkActionsOptions): void {
  const bulkBar = document.querySelector<HTMLElement>(options.bulkBarSelector);
  const countEl = document.querySelector<HTMLElement>(options.countSelector);

  if (!bulkBar || !countEl) return;

  // Update counter with consistent format: (n)
  countEl.textContent = `(${count})`;

  // Show/hide bar based on selection count
  if (count > 0) {
    bulkBar.hidden = false;
  } else {
    bulkBar.hidden = true;
  }
}

/**
 * Initialize cancel button handler
 * @param options Configuration options
 */
export function initCancelButton(options: BulkActionsOptions): void {
  if (!options.cancelSelector || !options.onCancel) return;

  const cancelBtn = document.querySelector<HTMLButtonElement>(options.cancelSelector);
  if (!cancelBtn) return;

  cancelBtn.addEventListener('click', options.onCancel);
}

/**
 * Create a complete bulk actions manager
 * Returns update function bound to the provided options
 */
export function createBulkActionsManager(options: BulkActionsOptions) {
  // Initialize cancel button if provided
  initCancelButton(options);

  // Return bound update function
  return {
    update: (count: number) => updateBulkActionsBar(count, options),
  };
}
