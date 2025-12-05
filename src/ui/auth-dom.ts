import type { UserProfile } from '@api/types';
import { clearToken, initAuthState, setUser } from '@state/auth-state';

export async function applyInitialAuthState(): Promise<void> {
  await initAuthState();
}

export function applyLoginStateToDOM(user?: UserProfile | null): void {
  if (user) setUser(user);
}

export function handleLogoutDom(): void {
  clearToken();
  setUser(null);
}
