import { t } from '@i18n';
import { md5 } from '@utils/md5';

function updateAvatar(email: string, container: HTMLElement | null): void {
  if (!container) return;

  const normalized = email.toLowerCase().trim();

  // Empty email → show anonymous (img)
  // Note: publicDir:'static' in vite.config.ts → static/img maps to /img in prod
  if (!normalized) {
    container.innerHTML = `<img class="avatar-icon" src="/img/anonymous-avatar.svg" alt="" aria-hidden="true" />`;
    return;
  }

  // Email entered → try Gravatar
  const hash = md5(normalized);
  const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;

  const img = document.createElement('img');
  img.className = 'avatar-icon';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');

  // Fallback to ava.svg on error (matches account form)
  img.onerror = () => {
    container.innerHTML = `<img class="avatar-icon" src="/img/icons/ava.svg" alt="" aria-hidden="true" />`;
  };

  img.src = gravatarUrl;
  container.innerHTML = '';
  container.appendChild(img);
}

export function bindAvatarPreview(form: HTMLFormElement): void {
  const input = form.querySelector<HTMLInputElement>('[data-avatar-source]');
  const label = form.querySelector<HTMLElement>('[data-avatar-label]');
  const container = form.querySelector<HTMLElement>('[data-avatar-container]');
  if (!input) return;

  const update = (value: string): void => {
    const trimmed = value.trim();
    if (label) label.textContent = trimmed || t('auth.login.avatarPlaceholder');
    updateAvatar(trimmed, container);
  };

  update(input.value || '');
  input.addEventListener('input', (event) => update((event.target as HTMLInputElement).value));
}
