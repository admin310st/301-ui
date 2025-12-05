export async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    console.debug('Failed to parse JSON', error);
    return null;
  }
}

export function toJsonBody(payload: unknown): string {
  return JSON.stringify(payload ?? {});
}
