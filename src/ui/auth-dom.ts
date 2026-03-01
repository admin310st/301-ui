import type { UserProfile } from '@api/types';
import { clearAuthToken, initAuthState, setUser } from '@state/auth-state';
import { markAuthResolved } from '@ui/visibility';

export async function applyInitialAuthState(): Promise<void> {
  await initAuthState();
  markAuthResolved();
}

export function applyLoginStateToDOM(user?: UserProfile | null): void {
  if (user) setUser(user);
}

export function handleLogoutDom(): void {
  clearAuthToken();
  setUser(null);
}
