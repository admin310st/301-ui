import { resetPassword } from '@api/auth';
import type { CommonErrorResponse, ResetPasswordRequest } from '@api/types';
import { t, tWithVars } from '@i18n';
import { getTurnstileRequiredMessage, getTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
  telegram: 'Telegram',
};

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || t('auth.reset.errors.fallback')
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'email_not_verified':
      return t('auth.reset.errors.emailNotVerified');
    case 'invalid_identifier':
      return t('auth.reset.errors.invalidIdentifier');
    case 'turnstile_failed':
      return t('auth.reset.errors.turnstileFailed');
    case 'turnstile_required':
      return t('auth.reset.errors.turnstileRequired');
    default:
      return code || t('auth.reset.errors.fallback');
  }
}

function readResetPayload(form: HTMLFormElement) {
  const typeInput = form.querySelector<HTMLInputElement>('[name="type"]');
  const valueInput =
    form.querySelector<HTMLInputElement>('[name="value"]') ||
    form.querySelector<HTMLInputElement>('[name="email"]');

  const value = valueInput?.value.trim() || '';
  const type = (typeInput?.value as ResetPasswordRequest['type']) || 'email';

  return { type, value } as const;
}

async function handleResetRequest(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const { value, type } = readResetPayload(form);
  const captcha = getTurnstileToken(form);

  if (!value) {
    setFormState(form, 'error', t('auth.reset.statusMissing'));
    return;
  }

  if (!captcha) {
    setFormState(form, 'error', getTurnstileRequiredMessage());
    return;
  }

  try {
    setFormState(form, 'pending', t('auth.reset.statusPending'));
    const res = await resetPassword({
      type,
      value,
      turnstile_token: captcha,
    });

    if (res.status === 'oauth_only' || res.oauth_only) {
      const provider = res.provider ? PROVIDER_LABELS[res.provider] ?? res.provider : null;
      const providerMessage = provider
        ? tWithVars('auth.reset.oauthOnlyProvider', { provider })
        : t('auth.reset.oauthOnly');
      setFormState(form, 'error', res.message || providerMessage);
      return;
    }

    const message = res.message || t('auth.reset.statusSent');
    setFormState(form, 'success', message);
    showGlobalMessage('info', message);
  } catch (error) {
    setFormState(form, 'error', mapErrorMessage(extractError(error)));
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
