import { register } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { loadUser } from '@state/auth-state';
import { getTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return apiError?.body?.message || apiError?.body?.error || apiError?.message || 'Registration failed';
}

async function handleRegisterSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';
  const captcha = getTurnstileToken(form);

  if (!email || !password) {
    setFormState(form, 'error', 'Email and password are required');
    return;
  }

  try {
    setFormState(form, 'pending', 'Creating account...');
    const res = await register({ email, password, turnstile_token: captcha || undefined });
    await loadUser();
    setFormState(form, 'success', res.message || 'Check your inbox to verify email');
    showGlobalMessage('success', 'Account created');
    form.reset();
  } catch (error) {
    setFormState(form, 'error', extractError(error));
    resetTurnstile(form);
  }
}

export function initRegisterForm(): void {
  document.querySelectorAll<HTMLFormElement>('[data-form="register"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleRegisterSubmit);
  });
}
