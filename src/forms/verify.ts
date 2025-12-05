import { verifyCode } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return apiError?.body?.message || apiError?.body?.error || apiError?.message || 'Verification failed';
}

async function handleVerify(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
  const code = form.querySelector<HTMLInputElement>('[name="code"]')?.value.trim();

  if (!email || !code) {
    setFormState(form, 'error', 'Email and code are required');
    return;
  }

  try {
    setFormState(form, 'pending', 'Verifying...');
    const res = await verifyCode({ email, code });
    setFormState(form, 'success', res.message || 'Verification complete');
    showGlobalMessage('success', 'Email confirmed');
    form.reset();
  } catch (error) {
    setFormState(form, 'error', extractError(error));
  }
}

export function initVerifyForm(): void {
  document.querySelectorAll<HTMLFormElement>('[data-form="verify"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleVerify);
  });
}
