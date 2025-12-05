import { register } from '../api/client';
import { getTurnstileTokenForForm } from '../turnstile';
import { setFormState } from '../ui/dom';
import { showGlobalMessage } from '../ui/notifications';
import { applyLoginStateToDOM, updateAuthStateFromMe } from '../utils/authState';

async function handleRegisterSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value.trim();
  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value || '';
  const turnstileToken = getTurnstileTokenForForm(form);

  if (!email || !password) {
    setFormState(form, 'error', 'Введите email и пароль');
    return;
  }
  if (!turnstileToken) {
    setFormState(form, 'error', 'Подтвердите капчу');
    return;
  }

  try {
    setFormState(form, 'loading', 'Создаём аккаунт...');
    const res = await register({ email, password, turnstile_token: turnstileToken });

    if (res.ok || res.access_token) {
      const user = res.user || (await updateAuthStateFromMe());
      applyLoginStateToDOM(user || res.user || null);
      setFormState(form, 'success', 'Проверьте почту или войдите сразу.');
      showGlobalMessage('success', 'Регистрация завершена');
      form.reset();
      return;
    }

    setFormState(form, 'error', res.message || res.error || 'Не удалось создать аккаунт');
  } catch (err) {
    console.error(err);
    setFormState(form, 'error', (err as Error).message || 'Ошибка регистрации');
  }
}

export function initRegisterForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-auth="register"]');
  if (!form) return;
  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', handleRegisterSubmit);
}
