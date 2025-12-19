import { getAuthState } from '@state/auth-state';

async function md5(text: string): Promise<string> {
  // Use Web Crypto API if available
  if (crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback would go here, but MD5 via SubtleCrypto is widely supported
  throw new Error('MD5 not supported');
}

export async function initAccountPage(): Promise<void> {
  const avatarImg = document.querySelector<HTMLImageElement>('[data-account-avatar]');
  const emailEl = document.querySelector('[data-account-email]');
  const nameEl = document.querySelector('[data-account-name]');
  const idEl = document.querySelector('[data-account-id]');
  const roleEl = document.querySelector('[data-account-role]');
  const planEl = document.querySelector('[data-account-plan]');
  const tgIdEl = document.querySelector('[data-account-tg-id]');
  const tgRow = document.querySelector('[data-account-tg-row]');

  if (!avatarImg) return;

  const state = getAuthState();
  const user = state.user;

  if (!user) {
    // No user loaded yet, will be updated via auth state change
    return;
  }

  // Update avatar with Gravatar or fallback
  if (user.email) {
    const normalized = user.email.toLowerCase().trim();
    const hash = await md5(normalized);
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404&s=96`;

    // Try to load Gravatar, fallback to panda on error
    avatarImg.onerror = () => {
      avatarImg.src = '/img/icons/ava.svg';
      avatarImg.onerror = null; // Prevent infinite loop
    };
    avatarImg.src = gravatarUrl;
  } else {
    avatarImg.src = '/img/icons/ava.svg';
  }

  // Update text fields
  if (emailEl) emailEl.textContent = user.email || '—';
  if (nameEl) nameEl.textContent = user.name || '—';
  if (idEl) idEl.textContent = user.id ? String(user.id) : '—';
  if (roleEl) roleEl.textContent = user.role || user.type || '—';
  if (planEl) planEl.textContent = user.plan || 'Free';

  // Show Telegram row only if tg_id exists
  if (tgRow) {
    if (user.tg_id) {
      tgRow.hidden = false;
      if (tgIdEl) tgIdEl.textContent = String(user.tg_id);
    } else {
      tgRow.hidden = true;
    }
  }
}
