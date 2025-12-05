import { register } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { TURNSTILE_REQUIRED_MESSAGE, getTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';
import { validatePasswordStrength } from '@utils/password';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || 'Registration failed'
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_login':
      return 'Неправильный логин или пароль. Попробуйте ещё раз или запросите восстановление доступа.';
    case 'user_already_registered':
      return 'Такой email уже зарегистрирован. Попробуйте войти или восстановить пароль.';
    case 'password_too_weak':
      return 'Пароль слишком слабый. Минимум 8 символов, буквы в разных регистрах и цифры.';
    case 'turnstile_failed':
      return 'Проверка защиты не пройдена. Обновите виджет и попробуйте ещё раз.';
    case 'turnstile_required':
      return 'Проверка защиты обязательна. Подтвердите Turnstile и попробуйте ещё раз.';
    default:
      return code;
  }
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

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    setFormState(form, 'error', passwordError);
    return;
  }

  if (!captcha) {
    setFormState(form, 'error', TURNSTILE_REQUIRED_MESSAGE);
    return;
  }

  try {
    setFormState(form, 'pending', 'Создаём аккаунт...');
    const res = await register({ email, password, turnstile_token: captcha || undefined });
    const statusMessage = res.message || `Мы отправили письмо на ${email}. Перейдите по ссылке, чтобы завершить регистрацию.`;
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
