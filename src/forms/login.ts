import { login } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { safeCall } from '@api/ui-client';
import { t } from '@i18n';
import { requireTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState } from '@ui/dom';
import { clearGlobalMessage } from '@ui/notifications';
import { loadUser } from '@state/auth-state';
import type { ApiError } from '@utils/errors';
import { bindAvatarPreview } from '@utils/avatarPreview';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.message ||
    apiError?.body?.error ||
    apiError?.body?.code ||
    apiError?.message ||
    t('auth.login.errors.fallback')
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_login':
      return t('auth.login.errors.invalidLogin');
    case 'user_already_registered':
      return t('auth.login.errors.userAlreadyRegistered');
    case 'password_too_weak':
      return t('auth.login.errors.passwordTooWeak');
    case 'turnstile_failed':
      return t('auth.login.errors.turnstileFailed');
    case 'turnstile_required':
      return t('auth.login.errors.turnstileRequired');
    default:
      return code || t('auth.login.errors.fallback');
  }
}

async function handleLoginSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  clearGlobalMessage();

  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';
  const captcha = requireTurnstileToken(form);

  if (!email || !password) {
    setFormState(form, 'error', t('auth.login.statusMissing'));
    return;
  }

  if (!captcha) return;

  try {
    setFormState(form, 'pending', t('auth.login.statusPending'));
    const res = await safeCall(
      () => login({ email, password, turnstile_token: captcha }),
      { lockKey: 'auth-login', retryOn401: false }
    );
    await loadUser();
    const successMessage = res.message || t('auth.login.statusSuccess');
    setFormState(form, 'success', successMessage);
    // Note: Random tips disabled (mobile compatibility issue)
    form.reset();
    window.location.hash = '#login';
  } catch (error) {
    const message = mapErrorMessage(extractError(error));
    setFormState(form, 'error', message);
    resetTurnstile(form);
  }
}

export function initLoginForm(): void {
  document.querySelectorAll<HTMLFormElement>('[data-form="login"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleLoginSubmit);
    bindAvatarPreview(form);
  });
}
