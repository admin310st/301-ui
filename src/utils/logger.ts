const PREFIX = '[301-ui]';

// Suppress debug logs in production (when hostname is app.301.st)
const isDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.'));

export function logInfo(message: string, ...args: unknown[]): void {
  console.info(PREFIX, message, ...args);
}

export function logDebug(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.debug(PREFIX, message, ...args);
  }
}

export function logError(message: string, ...args: unknown[]): void {
  console.error(PREFIX, message, ...args);
}
