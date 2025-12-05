import { initLoginForm } from './forms/login';
import { initRegisterForm } from './forms/register';
import { initTurnstile } from './turnstile';
import { applyInitialAuthState, handleLogoutDom } from './utils/authState';
import { logout } from './api/client';
import { showGlobalMessage } from './ui/notifications';

document.addEventListener('DOMContentLoaded', () => {
  applyInitialAuthState();
  initTurnstile();
  initLoginForm();
  initRegisterForm();

  const logoutBtn = document.querySelector<HTMLButtonElement>('[data-action="logout"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      await logout().catch((err) => console.debug('logout failed', err));
      handleLogoutDom();
      showGlobalMessage('success', 'Logged out');
    });
  }
});
