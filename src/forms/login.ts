import { login } from '../api/client';
import { getTurnstileTokenForForm } from '../turnstile';
import { setFormState } from '../ui/dom';
import { clearGlobalMessage, showGlobalMessage } from '../ui/notifications';
import { applyLoginStateToDOM, updateAuthStateFromMe } from '../utils/authState';

function bindAvatarPreview(input: HTMLInputElement | null): void {
  if (!input) return;
  const label = document.querySelector<HTMLElement>('[data-avatar-label]');
  const img = document.querySelector<HTMLImageElement>('[data-avatar-img]');

  const update = (value: string): void => {
    const trimmed = value.trim();
    if (label) label.textContent = trimmed || 'Укажите email';
    if (img && trimmed) {
      img.src = `/img/anonymous-avatar.svg`;
    }
  };

  update(input.value || '');
  input.addEventListener('input', (e) => update((e.target as HTMLInputElement).value));
}

async function handleLoginSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  clearGlobalMessage();

  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';
  const turnstileToken = getTurnstileTokenForForm(form);

  if (!email || !password) {
    setFormState(form, 'error', 'Enter email and password');
    return;
  }
  if (!turnstileToken) {
    setFormState(form, 'error', 'Подтвердите капчу');
    return;
  }

  try {
    setFormState(form, 'loading', 'Signing in...');
    const res = await login({ email, password, turnstile_token: turnstileToken });
    if (res.access_token) {
      const user = res.user || (await updateAuthStateFromMe());
      applyLoginStateToDOM(user || res.user || null);
      showGlobalMessage('success', 'Logged in');
      setFormState(form, 'success', 'Logged in');
      form.reset();
      return;
    }
    setFormState(form, 'error', res.message || res.error || 'Login failed');
  } catch (err) {
    console.error(err);
    setFormState(form, 'error', (err as Error).message || 'Login failed');
  }
}

export function initLoginForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-auth="login"]');
  if (!form) return;
  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', handleLoginSubmit);
  bindAvatarPreview(form.querySelector<HTMLInputElement>('[data-avatar-source]'));
}
