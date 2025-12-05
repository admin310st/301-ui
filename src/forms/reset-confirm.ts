import { confirmPassword } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { getResetCsrfToken } from '@state/reset-session';
import { setFormState } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return apiError?.body?.message || apiError?.body?.error || apiError?.message || 'Reset failed';
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
    setFormState(form, 'error', extractError(error));
  }
}

export function initResetConfirmForm(): void {
  document.querySelectorAll<HTMLFormElement>('[data-form="reset-confirm"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleResetConfirm);
  });
}
