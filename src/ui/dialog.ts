/**
 * Dialog (confirmation modal) utilities
 *
 * Provides functions to show/hide confirmation dialogs
 * as a replacement for browser confirm() prompts.
 */

/**
 * Show a dialog by name
 */
export function showDialog(dialogName: string): void {
  const dialog = document.querySelector<HTMLElement>(`[data-dialog="${dialogName}"]`);
  if (dialog) {
    dialog.hidden = false;
  }
}

/**
 * Hide a dialog by name
 */
export function hideDialog(dialogName: string): void {
  const dialog = document.querySelector<HTMLElement>(`[data-dialog="${dialogName}"]`);
  if (dialog) {
    dialog.hidden = true;
  }
}

/**
 * Initialize dialog close handlers
 * Handles clicks on [data-dialog-close] elements
 */
export function initDialogCloseHandlers(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const closeButton = target.closest<HTMLElement>('[data-dialog-close]');

    if (closeButton) {
      const dialog = closeButton.closest<HTMLElement>('[data-dialog]');
      if (dialog) {
        dialog.hidden = true;
      }
    }
  });
}
