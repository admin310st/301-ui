import { showGlobalMessage } from '@ui/notifications';
import { t } from '@i18n';

/**
 * Initialize inline editing for account fields
 */
export function initAccountEdit(): void {
  // Inline edit for name/email fields
  document.querySelectorAll('[data-edit-field]').forEach((fieldRow) => {
    const editTrigger = fieldRow.querySelector<HTMLButtonElement>('[data-edit-trigger]');
    const viewMode = fieldRow.querySelector<HTMLElement>('[data-view-mode]');
    const editMode = fieldRow.querySelector<HTMLElement>('[data-edit-mode]');
    const input = fieldRow.querySelector<HTMLInputElement>('[data-edit-input]');
    const saveBtn = fieldRow.querySelector<HTMLButtonElement>('[data-save-btn]');
    const cancelBtn = fieldRow.querySelector<HTMLButtonElement>('[data-cancel-btn]');
    const valueSpan = viewMode?.querySelector('span');

    if (!editTrigger || !viewMode || !editMode || !input || !saveBtn || !cancelBtn || !valueSpan) return;

    let originalValue = '';

    // Enter edit mode
    const enterEditMode = () => {
      originalValue = valueSpan.textContent?.trim() || '';
      input.value = originalValue === '—' ? '' : originalValue;
      viewMode.hidden = true;
      editMode.hidden = false;
      input.focus();
    };

    // Exit edit mode
    const exitEditMode = () => {
      viewMode.hidden = false;
      editMode.hidden = true;
      input.value = '';
    };

    // Save changes
    const saveChanges = async () => {
      const newValue = input.value.trim();
      if (!newValue) {
        showGlobalMessage('error', t('common.validation.required'));
        return;
      }

      // TODO: Send to API
      // For now, just update the UI
      valueSpan.textContent = newValue;
      exitEditMode();
      showGlobalMessage('success', t('common.messages.saved'));
    };

    // Cancel editing
    const cancelEdit = () => {
      exitEditMode();
    };

    editTrigger.addEventListener('click', enterEditMode);
    saveBtn.addEventListener('click', saveChanges);
    cancelBtn.addEventListener('click', cancelEdit);

    // Save on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveChanges();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });
  });

  // Toggle password change form
  const togglePasswordBtn = document.querySelector<HTMLButtonElement>('[data-toggle-password]');
  const passwordForm = document.querySelector<HTMLFormElement>('[data-password-form]');
  const cancelPasswordBtn = document.querySelector<HTMLButtonElement>('[data-cancel-password]');

  if (togglePasswordBtn && passwordForm && cancelPasswordBtn) {
    const toggleForm = () => {
      passwordForm.hidden = !passwordForm.hidden;
      if (!passwordForm.hidden) {
        // Focus first input when showing form
        const firstInput = passwordForm.querySelector<HTMLInputElement>('input');
        firstInput?.focus();
      } else {
        // Clear form when hiding
        passwordForm.reset();
      }
    };

    togglePasswordBtn.addEventListener('click', toggleForm);
    cancelPasswordBtn.addEventListener('click', toggleForm);

    // Handle password form submission
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPassword = passwordForm.querySelector<HTMLInputElement>('[data-current-password]')?.value;
      const newPassword = passwordForm.querySelector<HTMLInputElement>('[data-new-password]')?.value;
      const confirmPassword = passwordForm.querySelector<HTMLInputElement>('[data-confirm-password]')?.value;

      if (!currentPassword || !newPassword || !confirmPassword) {
        showGlobalMessage('error', t('common.validation.required'));
        return;
      }

      if (newPassword !== confirmPassword) {
        showGlobalMessage('error', t('account.security.passwordMismatch'));
        return;
      }

      if (newPassword.length < 8) {
        showGlobalMessage('error', t('auth.validation.passwordTooShort'));
        return;
      }

      // TODO: Send to API
      // For now, just show success
      passwordForm.reset();
      passwordForm.hidden = true;
      showGlobalMessage('success', t('account.security.passwordChanged'));
    });
  }
}
