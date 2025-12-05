import { login } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { TURNSTILE_REQUIRED_MESSAGE, getTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState, qs } from '@ui/dom';
import { clearGlobalMessage, showGlobalMessage } from '@ui/notifications';
import { loadUser } from '@state/auth-state';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || 'Login failed'
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

function bindAvatarPreview(form: HTMLFormElement): void {
  const input = form.querySelector<HTMLInputElement>('[data-avatar-source]');
  const label = qs<HTMLElement>('[data-avatar-label]');
  const img = qs<HTMLImageElement>('[data-avatar-img]');
  if (!input) return;

  const update = (value: string): void => {
    const trimmed = value.trim();
    if (label) label.textContent = trimmed || 'Укажите email';
    if (img) img.src = trimmed ? '/img/anonymous-avatar.svg' : '/img/anonymous-avatar.svg';
  };

  update(input.value || '');
  input.addEventListener('input', (event) => update((event.target as HTMLInputElement).value));
}

async function handleLoginSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  clearGlobalMessage();

  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';
  const captcha = getTurnstileToken(form);

  if (!email || !password) {
    setFormState(form, 'error', 'Введите email и пароль');
    return;
  }

  if (!captcha) {
    setFormState(form, 'error', TURNSTILE_REQUIRED_MESSAGE);
    return;
  }

  try {
    setFormState(form, 'pending', 'Входим...');
    const res = await login({ email, password, turnstile_token: captcha || undefined });
    await loadUser();
    setFormState(form, 'success', res.message || 'Вы вошли в 301.st');
    showGlobalMessage('success', 'Вы вошли в 301.st');
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
