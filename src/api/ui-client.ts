/**
 * UI-specific wrapper over SDK API calls
 * Handles: in-flight guards, abort controllers, 401 retry, error normalization
 */

import { refresh, logout } from '@api/auth';
import { setAuthToken, setUser } from '@state/auth-state';
import type { ApiError } from '@utils/errors';

// ============================================================================
// Error Normalization
// ============================================================================

export interface NormalizedError {
  code:
    | 'ABORTED'
    | 'NETWORK_ERROR'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'SERVER_ERROR'
    | 'API_ERROR';
  message: string;
  details?: unknown;
  recoverable?: boolean;
}

/**
 * Normalize any error to NormalizedError
 */
export function normalizeError(error: unknown): NormalizedError {
  // AbortError
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      code: 'ABORTED',
      message: 'Request was cancelled',
      details: error,
      recoverable: false,
    };
  }

  // Network error (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
      details: error,
      recoverable: true,
    };
  }

  // ApiError (from our utils/errors.ts)
  if (error && typeof error === 'object' && 'status' in error && 'body' in error) {
    const apiError = error as ApiError;
    const status = apiError.status;
    const body = apiError.body as any;

    // Extract recoverable flag from API response if exists
    const recoverable = body?.recoverable ?? undefined;

    // Map status codes to error codes
    if (status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: body?.message || 'Unauthorized. Please log in.',
        details: body,
        recoverable: false,
      };
    }

    if (status === 403) {
      return {
        code: 'FORBIDDEN',
        message: body?.message || 'Access forbidden.',
        details: body,
        recoverable: false,
      };
    }

    if (status === 404) {
      return {
        code: 'NOT_FOUND',
        message: body?.message || 'Resource not found.',
        details: body,
        recoverable: false,
      };
    }

    if (status === 400 || status === 422) {
      return {
        code: 'VALIDATION_ERROR',
        message: body?.message || 'Validation error.',
        details: body,
        recoverable: recoverable ?? false,
      };
    }

    if (status === 409) {
      return {
        code: 'CONFLICT',
        message: body?.message || 'Conflict.',
        details: body,
        recoverable: recoverable ?? false,
      };
    }

    if (status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: body?.message || 'Too many requests. Please try again later.',
        details: body,
        recoverable: true,
      };
    }

    if (status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: body?.message || 'Server error. Please try again.',
        details: body,
        recoverable: recoverable ?? true,
      };
    }

    // Other API errors
    return {
      code: 'API_ERROR',
      message: body?.message || apiError.message || 'Request failed.',
      details: body,
      recoverable: recoverable ?? false,
    };
  }

  // Generic error
  return {
    code: 'API_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
    details: error,
    recoverable: false,
  };
}

// ============================================================================
// In-Flight Guard
// ============================================================================

const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Prevent duplicate requests with the same key
 */
export async function withInFlight<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const promise = fn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

// ============================================================================
// Abort Controller (Last Wins)
// ============================================================================

const abortControllers = new Map<string, AbortController>();

/**
 * Abort previous request with the same key
 * Returns new AbortSignal for current request
 */
export function abortPrevious(key: string): AbortSignal {
  // Abort previous request
  abortControllers.get(key)?.abort();

  // Create new controller
  const controller = new AbortController();
  abortControllers.set(key, controller);
  return controller.signal;
}

// ============================================================================
// Safe Call with 401 Retry
// ============================================================================

export interface SafeCallOptions {
  /** Lock key for in-flight guard */
  lockKey?: string;
  /** Abort key for "last wins" strategy */
  abortKey?: string;
  /** Retry on 401 after refresh (default: true) */
  retryOn401?: boolean;
  /** Optional error handler callback */
  onError?: (error: NormalizedError) => void;
}

/**
 * Wrapper for API calls with error normalization and 401 retry
 *
 * Usage patterns:
 * - Detail loads: use abortKey (without lockKey)
 * - Form submits: use lockKey (without abortKey)
 */
export async function safeCall<T>(
  apiCall: (signal?: AbortSignal) => Promise<T>,
  options: SafeCallOptions = {}
): Promise<T> {
  const { lockKey, abortKey, retryOn401 = true, onError } = options;

  // CRITICAL: Create signal INSIDE run function to avoid abort/in-flight conflicts
  const run = async (): Promise<T> => {
    const signal = abortKey ? abortPrevious(abortKey) : undefined;

    try {
      // First attempt (pass signal to apiCall)
      return await apiCall(signal);
    } catch (error) {
      const normalized = normalizeError(error);

      // Handle 401 with retry
      if (normalized.code === 'UNAUTHORIZED' && retryOn401) {
        try {
          // Attempt refresh (PROTECTED by in-flight guard)
          const refreshRes = await withInFlight('auth-refresh', () => refresh());

          // Update auth state (CRITICAL: refresh() doesn't do this)
          if (refreshRes.access_token) {
            setAuthToken(refreshRes.access_token);
          }
          if (refreshRes.user) {
            setUser(refreshRes.user);
          }

          // Retry original call ONCE (with same signal)
          try {
            return await apiCall(signal);
          } catch (retryError) {
            const retryNormalized = normalizeError(retryError);

            // If still 401 after retry, logout
            if (retryNormalized.code === 'UNAUTHORIZED') {
              await logout();
            }

            if (onError) onError(retryNormalized);
            throw retryNormalized;
          }
        } catch (refreshError) {
          // Refresh failed, logout
          await logout();
          const refreshNormalized = normalizeError(refreshError);
          if (onError) onError(refreshNormalized);
          throw refreshNormalized;
        }
      }

      // Not 401, or retry disabled
      if (onError) onError(normalized);
      throw normalized;
    }
  };

  // Apply in-flight guard if lockKey provided
  return lockKey ? withInFlight(lockKey, run) : run();
}
