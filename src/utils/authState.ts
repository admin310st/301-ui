import { me, refresh } from '../api/client';
import type { UserMe } from '../api/types';
import { qs, qsa } from '../ui/dom';
import { clearGlobalMessage, showGlobalMessage } from '../ui/notifications';
import { setWSVar, updateFetchBuster } from './webstudio';

export interface AuthState {
  isLoggedIn: boolean;
  user: UserMe | null;
  token: string | null;
}

const TOKEN_KEY = 'auth_token';

let currentState: AuthState = {
  isLoggedIn: false,
  user: null,
  token: null,
};

export function getAuthToken(): string | null {
  if (currentState.token) return currentState.token;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  currentState = { ...currentState, token };
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function applyDomState(): void {
  qsa<HTMLElement>('[data-onlogin]').forEach((node) => {
    node.hidden = !currentState.isLoggedIn;
  });
  qsa<HTMLElement>('[data-onlogout]').forEach((node) => {
    node.hidden = currentState.isLoggedIn;
  });

  const emailEls = qsa<HTMLElement>('[data-user-email]');
  emailEls.forEach((el) => {
    el.textContent = currentState.user?.email || '';
  });
}

export function applyLoginStateToDOM(user: UserMe | null): void {
  currentState = {
    ...currentState,
    isLoggedIn: Boolean(user),
    user,
  };
  applyDomState();
  setWSVar('authEmail', user?.email || '');
  updateFetchBuster();
}

export async function updateAuthStateFromMe(): Promise<UserMe | null> {
  try {
    clearGlobalMessage();
    const profile = await me();
    applyLoginStateToDOM(profile || null);
    return profile || null;
  } catch (err) {
    console.debug('me failed', err);
    applyLoginStateToDOM(null);
    return null;
  }
}

export async function applyInitialAuthState(): Promise<void> {
  const token = getAuthToken();
  if (token) {
    try {
      await updateAuthStateFromMe();
      return;
    } catch {}
  }
  try {
    const res = await refresh();
    if (res.access_token || res.user) {
      if (res.access_token) setAuthToken(res.access_token);
      applyLoginStateToDOM(res.user || null);
      return;
    }
  } catch (err) {
    console.debug('refresh failed', err);
  }
  applyLoginStateToDOM(null);
}

export function handleLogoutDom(): void {
  setAuthToken(null);
  applyLoginStateToDOM(null);
  showGlobalMessage('success', 'Logged out');
}

export function setStatusText(text: string): void {
  const node = qs('[data-auth-status]');
  if (node) node.textContent = text;
}
