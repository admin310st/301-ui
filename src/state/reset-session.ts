let csrfToken: string | null = null;

export function setResetCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getResetCsrfToken(): string | null {
  return csrfToken;
}

export function clearResetSession(): void {
  csrfToken = null;
}
