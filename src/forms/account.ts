import { getAuthState } from '@state/auth-state';
import { initDropdowns } from '@ui/dropdown';
import { md5 } from '@utils/md5';

/**
 * Initialize plan selector dropdown
 */
function initPlanSelector(): void {
  const dropdown = document.querySelector('[data-dropdown="user-plan"]');
  if (!dropdown) return;

  const items = dropdown.querySelectorAll('.dropdown__item');
  const label = dropdown.querySelector('[data-selected-label]');
  const trigger = dropdown.querySelector('.dropdown__trigger') as HTMLElement;

  // Handle item selection
  items.forEach((item) => {
    item.addEventListener('click', () => {
      const value = item.getAttribute('data-value');
      const text = item.textContent?.trim();

      // Update selected state
      items.forEach((i) => i.classList.remove('is-active'));
      item.classList.add('is-active');

      // Update label
      if (label && text) {
        label.textContent = text;
      }

      // Store value for save
      if (trigger) {
        trigger.setAttribute('data-selected-value', value || 'free');
      }

      // TODO: Send to API to update plan
      console.log('Plan changed to:', value);
    });
  });
}

export function initAccountPage(): void {
  // Initialize standard dropdown system for profile card FIRST
  const profileCard = document.querySelector('.card.card--panel');
  if (profileCard) {
    initDropdowns(profileCard as HTMLElement);
  }

  // Initialize plan selector dropdown (selection logic)
  initPlanSelector();

  const avatarImg = document.querySelector<HTMLImageElement>('[data-account-avatar]');
  const emailEl = document.querySelector('[data-account-email]');
  const nameEl = document.querySelector('[data-account-name]');
  const idEl = document.querySelector('[data-account-id]');
  const roleEl = document.querySelector('[data-account-role]');
  const planSelector = document.querySelector('[data-account-plan-selector]') as HTMLElement;
  const planLabel = document.querySelector('[data-dropdown="user-plan"] [data-selected-label]');
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
    const hash = md5(normalized);
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
  if (roleEl) roleEl.textContent = user.user_type || '—';

  // Update plan selector
  const userPlan = 'free'; // TODO: plan not yet in backend user model
  if (planSelector) {
    planSelector.setAttribute('data-selected-value', userPlan);
  }
  if (planLabel) {
    const planNames: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
      buss: 'Business'
    };
    planLabel.textContent = planNames[userPlan] || 'Free';
  }

  // Update is-active state on dropdown items
  const dropdown = document.querySelector('[data-dropdown="user-plan"]');
  if (dropdown) {
    const items = dropdown.querySelectorAll('.dropdown__item');
    items.forEach((item) => {
      const itemValue = item.getAttribute('data-value');
      if (itemValue === userPlan) {
        item.classList.add('is-active');
      } else {
        item.classList.remove('is-active');
      }
    });
  }

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
