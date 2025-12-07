import { confirmPassword } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { t } from '@i18n';
import { getResetCsrfToken, setResetCsrfToken } from '@state/reset-session';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';
import { validatePasswordStrength } from '@utils/password';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code ||
    apiError?.body?.error ||
    apiError?.body?.message ||
    apiError?.message ||
    t('auth.resetConfirm.errors.fallback')
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'reset_session_required':
    case 'reset_session_missing':
      return t('auth.resetConfirm.errors.sessionRequired');
    case 'reset_session_expired':
      return t('auth.resetConfirm.errors.sessionExpired');
    case 'csrf_token_invalid':
    case 'csrf_invalid':
      return t('auth.resetConfirm.errors.csrfInvalid');
    case 'password_reused':
      return t('auth.resetConfirm.errors.passwordReused');
    case 'password_too_weak':
      return t('auth.resetConfirm.errors.passwordTooWeak');
    default:
      return code || t('auth.resetConfirm.errors.fallback');
  }
}

async function handleResetConfirm(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';
  const passwordConfirm = form.querySelector<HTMLInputElement>('[name="password_confirm"]')?.value || '';
  const csrfToken = getResetCsrfToken();

  if (!csrfToken) {
    const message = t('auth.resetConfirm.errors.sessionExpired');
    setFormState(form, 'error', message);
    showGlobalMessage('error', message);
    window.location.hash = '#reset';
    return;
  }

  if (!password || !passwordConfirm) {
    setFormState(form, 'error', t('auth.resetConfirm.statusMissing'));
    return;
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    setFormState(form, 'error', passwordError);
    return;
  }

  if (password !== passwordConfirm) {
    setFormState(form, 'error', t('auth.resetConfirm.statusMismatch'));
    return;
  }

  try {
    setFormState(form, 'pending', t('auth.resetConfirm.statusPending'));
    const res = await confirmPassword({ password, csrf_token: csrfToken });
    const message = res.message || t('auth.resetConfirm.statusSuccess');
    setFormState(form, 'success', message);
    showGlobalMessage('success', message);
    setTimeout(() => {
      window.location.hash = '#login';
    }, 1200);
  } catch (error) {
    const code = extractError(error);
    const message = mapErrorMessage(code);
    setFormState(form, 'error', message);

    if (
      code === 'reset_session_required' ||
      code === 'reset_session_missing' ||
      code === 'reset_session_expired' ||
      code === 'csrf_token_invalid' ||
      code === 'csrf_invalid'
    ) {
      setResetCsrfToken(null);
      showGlobalMessage('error', message);
      window.location.hash = '#reset';
    }
  }
}

export function initResetConfirmForm(): void {
  document.querySelectorAll<HTMLFormElement>('[data-form="reset-confirm"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleResetConfirm);
  });
}
