import { resetPassword } from '@api/auth';
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
    setFormState(form, 'error', 'Укажите email');
    return;
  }

  try {
    if (!captcha) {
      setFormState(form, 'error', 'Подтвердите проверку Turnstile');
      return;
    }

    setFormState(form, 'pending', 'Отправляем ссылку...');
    const res = await resetPassword({ type: 'email', value: email, turnstile_token: captcha });

    if (res.oauth_only) {
      setFormState(form, 'error', 'Войдите через Google/GitHub');
      return;
    }

    const message = res.message || 'Письмо со ссылкой для сброса отправлено. Ссылка действует 15 минут.';
    setFormState(form, 'success', message);
    showGlobalMessage('info', message);
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
