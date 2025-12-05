const PREFIX = '[301-ui]';

export function logInfo(message: string, ...args: unknown[]): void {
  console.info(PREFIX, message, ...args);
}

export function logDebug(message: string, ...args: unknown[]): void {
  console.debug(PREFIX, message, ...args);
}

export function logError(message: string, ...args: unknown[]): void {
  console.error(PREFIX, message, ...args);
}
