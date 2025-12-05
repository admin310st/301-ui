import { requestPasswordReset } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { getTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return apiError?.body?.message || apiError?.body?.error || apiError?.message || 'Reset request failed';
}

async function handleResetRequest(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
  const captcha = getTurnstileToken(form);

  if (!email) {
    setFormState(form, 'error', 'Email is required');
    return;
  }

  try {
    setFormState(form, 'pending', 'Sending reset link...');
    const res = await requestPasswordReset({ email, turnstile_token: captcha || undefined });
    setFormState(form, 'success', res.message || 'Check your inbox for reset instructions');
    showGlobalMessage('info', 'Reset email sent');
    form.reset();
  } catch (error) {
    setFormState(form, 'error', extractError(error));
    resetTurnstile(form);
  }
}

export function initResetRequestForm(): void {
  document.querySelectorAll<HTMLFormElement>('[data-form="reset-request"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleResetRequest);
  });
}
