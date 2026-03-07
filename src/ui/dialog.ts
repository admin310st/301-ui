/**
 * Dialog (confirmation modal) utilities
 *
 * Provides functions to show/hide confirmation dialogs
 * as a replacement for browser confirm() prompts.
 *
 * Contract:
 *   [data-dialog="name"]       — dialog root (hidden by default)
 *   [data-confirm]             — confirm/action button
 *   [data-dialog-close]        — cancel/close buttons + .dialog__overlay backdrop
 */

// Track the element that opened the dialog so we can restore focus
let triggerElement: HTMLElement | null = null;


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

    // Remember trigger for focus restore
    triggerElement = document.activeElement as HTMLElement | null;

    // Show dialog
    dialog.hidden = false;

    // Stable contract: single [data-confirm] attribute
    const confirmBtn = dialog.querySelector<HTMLElement>('[data-confirm]');

    const handleConfirm = () => {
      close(true);
    };

    const handleCancel = () => {
      close(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      }
    };

    const close = (result: boolean) => {
      dialog.hidden = true;
      cleanup();
      // Restore focus to trigger element
      if (triggerElement && typeof triggerElement.focus === 'function') {
        triggerElement.focus();
        triggerElement = null;
      }

      resolve(result);
    };

    const cleanup = () => {
      confirmBtn?.removeEventListener('click', handleConfirm);
      closeButtons.forEach(btn => btn.removeEventListener('click', handleCancel));
      document.removeEventListener('keydown', handleEscape);
    };

    // Attach listeners
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleConfirm);
    }

    const closeButtons = dialog.querySelectorAll('[data-dialog-close]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', handleCancel);
    });

    // Escape key
    document.addEventListener('keydown', handleEscape);

    // Focus the confirm button (or first focusable) for keyboard access
    requestAnimationFrame(() => {
      const focusTarget = confirmBtn
        || dialog.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusTarget?.focus();
    });
  });
}

/**
 * Initialize dialog close handlers
 * Handles clicks on [data-dialog-close] elements (delegated)
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
