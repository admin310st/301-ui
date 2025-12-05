import { resetPassword } from '@api/auth';
import type { CommonErrorResponse, ResetPasswordRequest } from '@api/types';
import { TURNSTILE_REQUIRED_MESSAGE, getTurnstileToken, resetTurnstile } from '../turnstile';
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
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || 'Reset request failed'
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'email_not_verified':
      return 'Email не подтверждён. Проверьте почту или пройдите регистрацию заново.';
    case 'invalid_identifier':
      return 'Не удалось найти пользователя с таким email.';
    case 'turnstile_failed':
      return 'Проверка защиты не пройдена. Обновите виджет и попробуйте ещё раз.';
    case 'turnstile_required':
      return 'Проверка защиты обязательна. Подтвердите Turnstile и попробуйте ещё раз.';
    default:
      return code;
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
    setFormState(form, 'error', 'Укажите email для восстановления');
    return;
  }

  if (!captcha) {
    setFormState(form, 'error', TURNSTILE_REQUIRED_MESSAGE);
    return;
  }

  try {
    setFormState(form, 'pending', 'Отправляем ссылку...');
    const res = await resetPassword({
      type,
      value,
      turnstile_token: captcha,
    });

    if (res.status === 'oauth_only' || res.oauth_only) {
      const provider = res.provider ? PROVIDER_LABELS[res.provider] ?? res.provider : null;
      const providerMessage = provider
        ? `Сброс пароля недоступен. Войдите через ${provider}.`
        : 'Сброс пароля недоступен. Войдите через привязанного провайдера.';
      setFormState(form, 'error', res.message || providerMessage);
      return;
    }

    const message =
      res.message ||
      'Письмо со ссылкой для сброса отправлено. Ссылка действует 15 минут.';
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
