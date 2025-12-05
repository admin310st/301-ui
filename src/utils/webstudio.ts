import { authFetchBuster } from '../api/client';

declare global {
  interface Window {
    webstudioSetVariable?: (name: string, value: string) => void;
  }
}

let fetchBuster = 0;

export function setWSVar(name: string, value: string): void {
  try {
    if (typeof window.webstudioSetVariable === 'function') {
      window.webstudioSetVariable(name, value);
    }
  } catch (err) {
    console.debug('webstudio var failed', err);
  }
}

export function updateFetchBuster(): void {
  fetchBuster += 1;
  setWSVar('authFetchBuster', `${fetchBuster}`);
  authFetchBuster().catch((err) => console.debug('buster fetch failed', err));
}
