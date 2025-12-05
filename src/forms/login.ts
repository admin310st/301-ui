import { login } from '@api/auth';
import type { CommonErrorResponse } from '@api/types';
import { getTurnstileToken, resetTurnstile } from '../turnstile';
import { setFormState, qs } from '@ui/dom';
import { clearGlobalMessage, showGlobalMessage } from '@ui/notifications';
import { loadUser } from '@state/auth-state';
import type { ApiError } from '@utils/errors';

function extractError(error: unknown): string {
  const apiError = error as ApiError<CommonErrorResponse>;
  return apiError?.body?.message || apiError?.body?.error || apiError?.message || 'Login failed';
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
    setFormState(form, 'error', 'Enter email and password');
    return;
  }

  try {
    setFormState(form, 'pending', 'Signing in...');
    const res = await login({ email, password, turnstile_token: captcha || undefined });
    await loadUser();
    setFormState(form, 'success', res.message || 'Logged in');
    showGlobalMessage('success', 'Logged in');
    form.reset();
  } catch (error) {
    const message = extractError(error);
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
