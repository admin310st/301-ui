import { me } from '@api/auth';
import { apiFetch } from '@api/client';
import type { LoginResponse, MeResponse } from '@api/types';
import { logDebug, logInfo } from '@utils/logger';

type Listener = (state: AuthState) => void;

const TOKEN_KEY = 'auth_token';
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let listeners = new Set<Listener>();

export interface AuthState {
  token: string | null;
  user: MeResponse['user'] | null;
  loading: boolean;
}

let currentState: AuthState = {
  token: null,
  user: null,
  loading: false,
};

function notify(): void {
  listeners.forEach((listener) => listener({ ...currentState }));
}

export function onAuthChange(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => listeners.delete(listener);
}

export function getToken(): string | null {
  return currentState.token ?? localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  currentState = { ...currentState, token };
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    scheduleRefresh();
  } else {
    localStorage.removeItem(TOKEN_KEY);
    stopRefresh();
  }
  notify();
}

export function clearToken(): void {
  setToken(null);
}

export function isLoggedIn(): boolean {
  return Boolean(currentState.token && currentState.user);
}

export function setUser(user: MeResponse['user'] | null): void {
  currentState = { ...currentState, user };
  notify();
}

export async function loadUser(): Promise<MeResponse['user'] | null> {
  try {
    currentState = { ...currentState, loading: true };
    notify();
    const profile = await me();
    setUser(profile.user ?? profile ?? null);
    return profile.user ?? profile ?? null;
  } catch (error) {
    logDebug('Failed to load user', error);
    setUser(null);
    return null;
  } finally {
    currentState = { ...currentState, loading: false };
    notify();
  }
}

async function refreshToken(): Promise<void> {
  try {
    const res = await apiFetch<LoginResponse>('/refresh', { method: 'POST' });
    if (res.access_token) setToken(res.access_token);
    if ((res as MeResponse).user) setUser((res as MeResponse).user ?? null);
  } catch (error) {
    logDebug('Refresh failed', error);
    clearToken();
    setUser(null);
  }
}

function scheduleRefresh(): void {
  stopRefresh();
  if (!getToken()) return;
  refreshTimer = setTimeout(refreshToken, REFRESH_INTERVAL_MS);
}

function stopRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

function syncFromStorage(event: StorageEvent): void {
  if (event.key !== TOKEN_KEY) return;
  currentState = { ...currentState, token: event.newValue };
  notify();
  if (event.newValue) {
    void loadUser();
  } else {
    setUser(null);
  }
}

export async function initAuthState(): Promise<void> {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) {
    setToken(existing);
    await loadUser();
  } else {
    await refreshToken();
  }
  window.addEventListener('storage', syncFromStorage);
  logInfo('Auth state initialized');
}

export function teardownAuthState(): void {
  stopRefresh();
  window.removeEventListener('storage', syncFromStorage);
  listeners = new Set<Listener>();
}
