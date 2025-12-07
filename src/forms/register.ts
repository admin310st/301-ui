import { register } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { t, tWithVars } from '@i18n';
import { requireTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';
import { validatePasswordStrength } from '@utils/password';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || t('auth.register.errors.fallback')
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_login':
      return t('auth.register.errors.invalidLogin');
    case 'user_already_registered':
      return t('auth.register.errors.userAlreadyRegistered');
    case 'password_too_weak':
      return t('auth.register.errors.passwordTooWeak');
    case 'turnstile_failed':
      return t('auth.register.errors.turnstileFailed');
    case 'turnstile_required':
      return t('auth.register.errors.turnstileRequired');
    default:
      return code || t('auth.register.errors.fallback');
  }
}

async function handleRegisterSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';
  const captcha = requireTurnstileToken(form);

  if (!email || !password) {
    setFormState(form, 'error', t('auth.register.statusMissing'));
    return;
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    setFormState(form, 'error', passwordError);
    return;
  }

  if (!captcha) return;

  try {
    setFormState(form, 'pending', t('auth.register.statusPending'));
    const res = await register({ email, password, turnstile_token: captcha });
    const statusMessage =
      res.message || tWithVars('auth.register.statusSuccess', { email });
    setFormState(form, 'success', statusMessage);
    showGlobalMessage('info', statusMessage);
  } catch (error) {
    setFormState(form, 'error', mapErrorMessage(extractError(error)));
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
