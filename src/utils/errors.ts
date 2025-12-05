export interface ApiError<T = unknown> extends Error {
  status: number;
  body: T;
}

export function createApiError<T = unknown>(status: number, body: T, fallbackMessage = 'Request failed'): ApiError<T> {
  const message = typeof body === 'object' && body && 'message' in (body as Record<string, unknown>)
    ? String((body as Record<string, unknown>).message)
    : fallbackMessage;
  const error = new Error(message) as ApiError<T>;
  error.status = status;
  error.body = body;
  return error;
}
