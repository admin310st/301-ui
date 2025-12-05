import { confirmPasswordReset } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return apiError?.body?.message || apiError?.body?.error || apiError?.message || 'Reset failed';
}

async function handleResetConfirm(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const token = form.querySelector<HTMLInputElement>('[name="token"]')?.value.trim();
  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';

  if (!token || !password) {
    setFormState(form, 'error', 'Token and new password are required');
    return;
  }

  try {
    setFormState(form, 'pending', 'Updating password...');
    const res = await confirmPasswordReset({ token, password });
    setFormState(form, 'success', res.message || 'Password updated');
    showGlobalMessage('success', 'Password reset complete');
    form.reset();
  } catch (error) {
    setFormState(form, 'error', extractError(error));
  }
}

export function initResetConfirmForm(): void {
  document.querySelectorAll<HTMLFormElement>('[data-form="reset-confirm"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleResetConfirm);
  });
}
