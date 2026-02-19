import { register } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { safeCall } from '@api/ui-client';
import { t, tWithVars } from '@i18n';
import { requireTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';
import { validatePasswordStrength } from '@utils/password';
import { bindAvatarPreview } from '@utils/avatarPreview';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.message ||
    apiError?.body?.error ||
    apiError?.body?.code ||
    apiError?.message ||
    t('auth.register.errors.fallback')
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_login':
      return t('auth.register.errors.invalidLogin');
    case 'email_required':
      return t('auth.register.errors.emailRequired');
    case 'user_already_registered':
      return t('auth.register.errors.userAlreadyRegistered');
    case 'password_too_weak':
      return t('auth.register.errors.passwordTooWeak');
    case 'password_too_short':
      return t('auth.register.errors.passwordTooShort');
    case 'password_too_common':
      return t('auth.register.errors.passwordTooCommon');
    case 'email_send_failed':
      return t('auth.register.errors.emailSendFailed');
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
    const res = await safeCall(
      () => register({ email, password, turnstile_token: captcha }),
      { lockKey: 'auth-register', retryOn401: false }
    );
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
    bindAvatarPreview(form);
  });
}
