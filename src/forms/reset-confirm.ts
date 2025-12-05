import { confirmPassword } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { getResetCsrfToken, setResetCsrfToken } from '@state/reset-session';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';
import { validatePasswordStrength } from '@utils/password';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return (
    apiError?.body?.code || apiError?.body?.error || apiError?.body?.message || apiError?.message || 'Reset failed'
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case 'reset_session_required':
      return 'Сессия сброса не найдена. Запросите сброс пароля ещё раз.';
    case 'reset_session_expired':
      return 'Ссылка для сброса устарела. Запросите новый сброс пароля.';
    case 'csrf_token_invalid':
      return 'Сессия сброса некорректна. Запросите новую ссылку.';
    case 'password_reused':
      return 'Новый пароль не должен совпадать с предыдущим.';
    case 'password_too_weak':
      return 'Пароль слишком слабый. Минимум 8 символов, буквы в разных регистрах и цифры.';
    default:
      return code;
  }
}

async function handleResetConfirm(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';
  const passwordConfirm = form.querySelector<HTMLInputElement>('[name="password_confirm"]')?.value || '';
  const csrfToken = getResetCsrfToken();

  if (!csrfToken) {
    setFormState(form, 'error', 'Ссылка для сброса просрочена. Запросите новую.');
    return;
  }

  if (!password || !passwordConfirm) {
    setFormState(form, 'error', 'Введите новый пароль');
    return;
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    setFormState(form, 'error', passwordError);
    return;
  }

  if (password !== passwordConfirm) {
    setFormState(form, 'error', 'Пароли не совпадают');
    return;
  }

  try {
    setFormState(form, 'pending', 'Обновляем пароль...');
    const res = await confirmPassword({ password, csrf_token: csrfToken });
    const message = res.message || 'Пароль обновлён, можно войти';
    setFormState(form, 'success', message);
    showGlobalMessage('success', message);
    window.location.hash = '#login';
  } catch (error) {
    const code = extractError(error);
    setFormState(form, 'error', mapErrorMessage(code));
    if (
      code === 'reset_session_required' ||
      code === 'reset_session_expired' ||
      code === 'csrf_token_invalid'
    ) {
      setResetCsrfToken(null);
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
