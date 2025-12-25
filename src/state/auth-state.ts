import { me, refresh } from '@api/auth';
import type { LoginResponse, MeResponse } from '@api/types';
import { logDebug, logInfo } from '@utils/logger';
import { setWSVar, updateFetchBuster } from '@utils/webstudio';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

type Listener = (state: AuthState) => void;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let listeners = new Set<Listener>();

export interface AuthState {
  token: string | null;
  user: MeResponse['user'] | null;
  accountId: number | null;
  loading: boolean;
  isLoggedIn: boolean;
}

let currentState: AuthState = {
  token: null,
  user: null,
  accountId: null,
  loading: false,
  isLoggedIn: false,
};

function notify(): void {
  listeners.forEach((listener) => listener({ ...currentState }));
}

function updateState(partial: Partial<AuthState>): void {
  currentState = { ...currentState, ...partial };
  currentState.isLoggedIn = Boolean(currentState.token && currentState.user);
  notify();
}

export function onAuthChange(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => listeners.delete(listener);
}

export function getAuthState(): AuthState {
  return { ...currentState };
}

export function getAuthToken(): string | null {
  return currentState.token;
}

export function setAuthToken(token: string | null): void {
  updateState({ token });
  updateFetchBuster();
  setWSVar('authBearer', token ? `Bearer ${token}` : '');
  if (token) {
    scheduleRefresh();
  } else {
    stopRefresh();
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

export function isLoggedIn(): boolean {
  return currentState.isLoggedIn;
}

export function getAccountId(): number | null {
  return currentState.accountId;
}

export function setUser(user: MeResponse['user'] | null): void {
  updateState({ user });
}

export async function loadUser(): Promise<MeResponse['user'] | null> {
  try {
    updateState({ loading: true });
    const profile = await me();
    setUser(profile.user ?? profile ?? null);
    if (profile.active_account_id) {
      updateState({ accountId: profile.active_account_id });
    }
    return profile.user ?? profile ?? null;
  } catch (error) {
    logDebug('Failed to load user', error);
    setUser(null);
    return null;
  } finally {
    updateState({ loading: false });
  }
}

async function refreshToken(): Promise<void> {
  try {
    const res = await refresh();
    if (res.access_token) setAuthToken(res.access_token);
    if ((res as MeResponse).user) setUser((res as MeResponse).user ?? null);
  } catch (error) {
    logDebug('Refresh failed', error);
    clearAuthToken();
    setUser(null);
  }
}

function scheduleRefresh(): void {
  stopRefresh();
  if (!getAuthToken()) return;
  refreshTimer = setTimeout(refreshToken, REFRESH_INTERVAL_MS);
}

function stopRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

export async function initAuthState(): Promise<void> {
  // Strategy: refresh on startup plus periodic refreshes to keep the session aligned with the
  // backend lifecycle described in the API docs. If refresh fails we clear local auth state.
  try {
    updateState({ loading: true });
    const refreshed = await refresh();

    if (refreshed && (refreshed as LoginResponse).access_token) {
      const accessToken = (refreshed as LoginResponse).access_token;
      setAuthToken(accessToken ?? null);
      const profile = await me();
      setUser(profile.user ?? profile ?? null);
    } else {
      setAuthToken(null);
      setUser(null);
    }
  } catch (error) {
    logDebug('Auth init failed', error);
    setAuthToken(null);
    setUser(null);
  } finally {
    updateState({ loading: false });
    logInfo('Auth state initialized');
  }
}

export function teardownAuthState(): void {
  stopRefresh();
  listeners = new Set<Listener>();
}
