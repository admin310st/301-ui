import { getAuthState } from '@state/auth-state';
import { getGravatarUrl } from '@utils/gravatar';

export function initAccountPage(): void {
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
    getGravatarUrl(user.email, 120)
      .then((url) => {
        avatarImg.src = url;
      })
      .catch(() => {
        avatarImg.src = '/img/icons/ava.svg';
      });
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
