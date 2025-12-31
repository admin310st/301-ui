/**
 * Centralized API error handling utilities
 * Maps backend error codes to i18n keys and user-friendly messages
 */

import type { ApiError } from './errors';
import type { ApiErrorResponse } from '@api/types';
import { t } from '@i18n';

/**
 * Error category for different parts of the app
 */
export type ErrorCategory = 'auth' | 'integrations' | 'domains' | 'redirects';

/**
 * Extract error code from API error response
 * Checks body.error, body.code, body.message in that order
 */
export function extractErrorCode(error: unknown): string | null {
  const apiError = error as ApiError<ApiErrorResponse>;

  if (!apiError?.body) {
    return null;
  }

  const body = apiError.body;

  // Priority: error code > code field > message
  return body.error || body.message || null;
}

/**
 * Check if error is recoverable (temporary failure, can retry)
 * Returns true for errors like rate limiting, API unavailable, etc.
 */
export function isRecoverableError(error: unknown): boolean {
  const apiError = error as ApiError<ApiErrorResponse>;

  if (!apiError?.body) {
    return false;
  }

  // Check explicit recoverable flag from backend
  if (typeof apiError.body.recoverable === 'boolean') {
    return apiError.body.recoverable;
  }

  // Fallback: treat 429, 502, 503 as recoverable
  return apiError.status === 429 || apiError.status === 502 || apiError.status === 503;
}

/**
 * Get error context (additional details from backend)
 * Useful for Cloudflare API errors with cf_code and cf_message
 */
export function getErrorContext(error: unknown): Record<string, unknown> | null {
  const apiError = error as ApiError<ApiErrorResponse>;
  return apiError?.body?.context || null;
}

/**
 * Get Cloudflare-specific error message from context
 */
export function getCfErrorMessage(error: unknown): string | null {
  const context = getErrorContext(error);
  if (!context) return null;

  return (context.cf_message as string) || (context.message as string) || null;
}

/**
 * Map error code to i18n key for a specific category
 *
 * @example
 * mapErrorToI18nKey('bootstrap_invalid', 'integrations')
 * // Returns 'integrations.errors.bootstrapInvalid'
 */
export function mapErrorToI18nKey(errorCode: string, category: ErrorCategory): string {
  // Convert snake_case to camelCase for i18n key
  const camelCase = errorCode.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  return `${category}.errors.${camelCase}`;
}

/**
 * Get user-friendly error message with i18n support
 *
 * Usage:
 * ```ts
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   const message = getErrorMessage(error, 'integrations');
 *   showNotification('error', message);
 * }
 * ```
 */
export function getErrorMessage(
  error: unknown,
  category: ErrorCategory,
  fallback?: string
): string {
  const apiError = error as ApiError<ApiErrorResponse>;

  // Extract error code
  const errorCode = extractErrorCode(error);

  if (!errorCode) {
    return apiError?.message || fallback || t(`${category}.errors.fallback`);
  }

  // Try to get translated message
  const i18nKey = mapErrorToI18nKey(errorCode, category);
  const translatedMessage = t(i18nKey);

  // If translation exists (not the key itself), use it
  if (translatedMessage !== i18nKey) {
    return translatedMessage;
  }

  // Fallback 1: Check for Cloudflare context message
  if (category === 'integrations') {
    const cfMessage = getCfErrorMessage(error);
    if (cfMessage) {
      return t('integrations.errors.cfApiError', { message: cfMessage });
    }
  }

  // Fallback 2: Use backend message if available
  if (apiError?.body?.message) {
    return apiError.body.message;
  }

  // Fallback 3: Use error code as-is (better than nothing)
  if (errorCode) {
    return errorCode.replace(/_/g, ' ');
  }

  // Fallback 4: Generic error message
  return fallback || t(`${category}.errors.fallback`);
}

/**
 * Integration-specific error handler (convenience wrapper)
 */
export function getIntegrationErrorMessage(error: unknown): string {
  return getErrorMessage(error, 'integrations', 'Failed to connect integration');
}

/**
 * Auth-specific error handler (convenience wrapper)
 */
export function getAuthErrorMessage(error: unknown): string {
  return getErrorMessage(error, 'auth', 'Authentication failed');
}

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): boolean {
  const apiError = error as ApiError<ApiErrorResponse>;
  return apiError?.status === 429 || extractErrorCode(error) === 'rate_limit_exceeded';
}

/**
 * Check if error is a quota exceeded error
 */
export function isQuotaError(error: unknown): boolean {
  return extractErrorCode(error) === 'quota_exceeded';
}

/**
 * Check if error is a permissions error
 */
export function isPermissionsError(error: unknown): boolean {
  const errorCode = extractErrorCode(error);
  return errorCode === 'permissions_missing' || errorCode === 'owner_required' || errorCode === 'unauthorized';
}
