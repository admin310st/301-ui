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
 * Show confirmation dialog and wait for user response
 * @param dialogName Name of the dialog element (data-dialog attribute)
 * @param data Optional data to populate dialog elements
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
export function showConfirmDialog(
  dialogName: string,
  data?: Record<string, string>
): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.querySelector<HTMLElement>(`[data-dialog="${dialogName}"]`);
    if (!dialog) {
      console.error(`Dialog not found: ${dialogName}`);
      resolve(false);
      return;
    }

    // Populate data elements
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        const element = dialog.querySelector<HTMLElement>(`[data-${key}]`);
        if (element) {
          element.textContent = value;
        }
      });
    }

    // Show dialog
    dialog.hidden = false;

    // Handler for confirm button
    const confirmBtn = dialog.querySelector('[data-confirm-replace]');
    const handleConfirm = () => {
      dialog.hidden = true;
      cleanup();
      resolve(true);
    };

    // Handler for cancel/close buttons
    const handleCancel = () => {
      dialog.hidden = true;
      cleanup();
      resolve(false);
    };

    // Cleanup function to remove event listeners
    const cleanup = () => {
      confirmBtn?.removeEventListener('click', handleConfirm);
      closeButtons.forEach(btn => btn.removeEventListener('click', handleCancel));
    };

    // Attach listeners
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleConfirm);
    }

    const closeButtons = dialog.querySelectorAll('[data-dialog-close]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', handleCancel);
    });
  });
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
