import { register } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
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
    setFormState(form, 'error', 'Нужны email и пароль');
    return;
  }

  try {
    setFormState(form, 'pending', 'Создаём аккаунт...');
    const res = await register({ email, password, turnstile_token: captcha || undefined });
    const statusMessage = res.message || `Мы отправили письмо на ${email}. Перейдите по ссылке, чтобы завершить регистрацию.`;
    setFormState(form, 'success', statusMessage);
    showGlobalMessage('info', statusMessage);
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
