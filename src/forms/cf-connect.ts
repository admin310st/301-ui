/**
 * Cloudflare Connect forms (Scoped Token & Quick Setup)
 */

import { showGlobalMessage } from '@ui/notifications';
import { hideLoading, setPendingNoticeFlash } from '@ui/loading-indicator';
import { showConfirmDialog } from '@ui/dialog';
import type { ApiErrorResponse } from '@api/types';
import type { ApiError } from '@utils/errors';

/**
 * Get user-friendly error message from API error response
 */
function getErrorMessage(error: ApiError<unknown>): string {
  const body = error.body as ApiErrorResponse | null;

  if (!body || typeof body !== 'object') {
    return error.message || 'Failed to connect Cloudflare account';
  }

  // If there's a Cloudflare-specific error in context, show it
  if (body.context?.cf_message || body.context?.message) {
    const contextMessage = body.context.cf_message || body.context.message;
    return `Cloudflare API error: ${contextMessage}`;
  }

  // Map error codes to user-friendly messages (aligned with API_IntegrationsKeys.md)
  const errorMessages: Record<string, string> = {
    // Bootstrap token errors
    'bootstrap_invalid': 'Invalid bootstrap token. Please check your API token and try again.',
    'bootstrap_expired': 'Bootstrap token has expired. Please generate a new token.',
    'bootstrap_not_active': 'Bootstrap token is not active. Please check your token status.',
    'permissions_missing': 'Bootstrap token has insufficient permissions. Make sure it has "Account Settings: Read" and "API Tokens: Edit" permissions.',

    // Quota and access errors
    'quota_exceeded': 'You have reached the maximum number of Cloudflare accounts for your plan.',
    'owner_required': 'Owner role is required to connect Cloudflare integrations.',

    // API communication errors
    'cf_rejected': 'Cloudflare API rejected the request. Please check your credentials.',
    'cf_unavailable': 'Cloudflare API is temporarily unavailable. Please try again later.',

    // Storage errors
    'storage_failed': 'Failed to save integration. Please try again or contact support.',
    'cleanup_failed': 'Failed to cleanup old integration. Please contact support.',

    // Request validation errors
    'invalid_json': 'Invalid request format. Please try again.',
    'missing_fields': 'Missing required fields. Please fill in all required information.',
  };

  const userMessage = errorMessages[body.error] || body.message || body.error;
  return userMessage;
}

/**
 * Parse Cloudflare test curl command and extract account ID and token
 * Example input:
 * curl "https://api.cloudflare.com/client/v4/accounts/6b1cc51fa359c59384677a156ad32c10/tokens/verify" \
 * -H "Authorization: Bearer y3DesLcDCtEfgz54jIBb0a2xDnPa_HtoMKrHZPGK"
 */
function parseCurlCommand(curlText: string): { accountId: string; token: string } | null {
  try {
    console.log('[parseCurl] Input text length:', curlText.length);
    console.log('[parseCurl] Input text:', curlText.substring(0, 200));

    // Extract account ID from URL (32 hex characters)
    const accountIdMatch = curlText.match(/accounts\/([a-f0-9]{32})/i);
    console.log('[parseCurl] Account ID match:', accountIdMatch?.[1]);

    // Extract token from Authorization header (allow letters, numbers, underscore, dash)
    const tokenMatch = curlText.match(/Bearer\s+([A-Za-z0-9_-]+)/);
    console.log('[parseCurl] Token match:', tokenMatch?.[1]);

    if (accountIdMatch && tokenMatch) {
      const result = {
        accountId: accountIdMatch[1],
        token: tokenMatch[1],
      };
      console.log('[parseCurl] Successfully parsed:', result);
      return result;
    }

    console.warn('[parseCurl] Failed to match - accountId:', !!accountIdMatch, 'token:', !!tokenMatch);
    return null;
  } catch (error) {
    console.error('[parseCurl] Error:', error);
    return null;
  }
}

/**
 * Initialize Scoped Token form
 */
export function initCfScopedTokenForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-form="cf-connect-scoped"]');
  if (!form) return;

  const accountIdInput = form.querySelector<HTMLInputElement>('[name="cf_account_id"]');
  const tokenTextarea = form.querySelector<HTMLTextAreaElement>('[name="cf_bootstrap_token"]');

  if (!tokenTextarea || !accountIdInput) return;

  // Auto-parse curl command when pasted into token field
  console.log('[cf-connect] Attaching paste listener to tokenTextarea');
  tokenTextarea.addEventListener('paste', (event) => {
    console.log('[cf-connect] Paste event fired');

    // Give the paste event time to complete
    setTimeout(() => {
      const pastedText = tokenTextarea.value;
      console.log('[cf-connect] Pasted text length:', pastedText.length);
      console.log('[cf-connect] Contains curl:', pastedText.includes('curl'));
      console.log('[cf-connect] Contains accounts/:', pastedText.includes('accounts/'));
      console.log('[cf-connect] Contains Bearer:', pastedText.includes('Bearer'));

      // Check if it looks like a curl command
      if (pastedText.includes('curl') && pastedText.includes('accounts/') && pastedText.includes('Bearer')) {
        console.log('[cf-connect] Detected curl command, attempting to parse...');
        const parsed = parseCurlCommand(pastedText);

        if (parsed) {
          console.log('[cf-connect] Parse successful, auto-filling fields');
          // Auto-fill the fields
          accountIdInput.value = parsed.accountId;
          tokenTextarea.value = parsed.token;

          // Show success message
          showGlobalMessage('success', 'Curl command parsed! Account ID and token extracted automatically.');

          // Trigger validation/visual feedback
          accountIdInput.dispatchEvent(new Event('input', { bubbles: true }));
          tokenTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          console.error('[cf-connect] Parse failed - could not extract account ID and token');
          showGlobalMessage('error', 'Failed to parse curl command. Please paste Account ID and token separately.');
        }
      } else {
        console.log('[cf-connect] Not a curl command, treating as plain token');
      }
    }, 10);
  });

  // Form submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[cf-connect] Scoped Token form submitted');

    const formData = new FormData(form);
    const accountId = formData.get('cf_account_id') as string;
    const token = formData.get('cf_bootstrap_token') as string;

    console.log('[cf-connect] Data:', { accountId, tokenLength: token?.length });

    // Validate presence
    if (!accountId || !token) {
      showStatus('error', 'Please fill in both Account ID and Bootstrap Token');
      return;
    }

    // Validate Account ID format (32 hex characters)
    if (!/^[a-f0-9]{32}$/i.test(accountId.trim())) {
      showStatus('error', 'Invalid Account ID format. Must be 32 hexadecimal characters (example: 2465945243a36d6fbbbefef7ca64cccd)');
      return;
    }

    // Validate Token format (40 characters: letters, numbers, underscore, dash)
    const trimmedToken = token.trim();
    if (!/^[A-Za-z0-9_-]{40}$/.test(trimmedToken)) {
      showStatus('error', 'Invalid Bootstrap Token format. Must be exactly 40 characters (example: 4JbTBRPa0h4MF3NVB6mVJjTGoKiHgXPw6ppbLI8C)');
      return;
    }

    const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"][form="cf-connect-scoped"]');
    const drawer = document.querySelector<HTMLElement>('[data-drawer="connect-cloudflare"]');

    // Show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="icon" data-icon="mono/refresh"></span><span>Verifying...</span>';
    }

    try {
      const { initCloudflare } = await import('@api/integrations');
      const response = await initCloudflare({
        cf_account_id: accountId.trim(),
        bootstrap_token: trimmedToken,
      });
      // Loading indicator (orange shimmer) shown automatically by apiFetch with showLoading: 'cf'

      // Show success message with sync info
      const syncInfo = response.sync
        ? ` Synced ${response.sync.zones} zones and ${response.sync.domains} domains.`
        : '';
      const successMsg = response.is_rotation
        ? `Token rotated successfully.${syncInfo}`
        : `Cloudflare account connected!${syncInfo}`;

      // Set pending notice flash for smooth shimmer → success transition
      setPendingNoticeFlash('success');

      showStatus('success', successMsg);
      showGlobalMessage('success', successMsg);

      // Update button to success state
      if (submitBtn) {
        submitBtn.classList.remove('btn--cf');
        submitBtn.classList.add('btn--success');
        submitBtn.innerHTML = '<span class="icon" data-icon="mono/check-circle"></span><span>Connected!</span>';
      }

      // Close drawer and refresh integrations after 2 seconds
      setTimeout(async () => {
        if (drawer) {
          drawer.setAttribute('hidden', '');
        }

        // Reload integrations to show new CF integration
        try {
          const { loadIntegrations } = await import('@ui/integrations');
          await loadIntegrations();
        } catch (error) {
          // Fallback: reload page
          console.error('Failed to reload integrations:', error);
          window.location.reload();
        }
      }, 2000);

    } catch (error: any) {
      // Loading indicator hidden automatically by apiFetch in finally block
      console.error('[cf-connect] Error:', error);

      const body = error.body as ApiErrorResponse | null;

      // Handle cf_account_conflict - show confirmation dialog
      if (body?.error === 'cf_account_conflict') {
        const context = body.context as { existing_account_id?: string; new_account_id?: string };

        // Show custom dialog instead of browser confirm()
        const confirmed = await showConfirmDialog('replace-cf-account', {
          'existing-account-id': context?.existing_account_id || 'existing account',
          'new-account-id': context?.new_account_id || 'this account',
        });

        if (confirmed) {
          // Retry with confirm_replace flag
          try {
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = '<span class="icon" data-icon="mono/refresh"></span><span>Replacing...</span>';
            }

            const { initCloudflare } = await import('@api/integrations');
            const response = await initCloudflare({
              cf_account_id: accountId.trim(),
              bootstrap_token: trimmedToken,
              confirm_replace: true,
            });
            // Loading indicator (orange shimmer) shown automatically by apiFetch with showLoading: 'cf'

            const syncInfo = response.sync
              ? ` Synced ${response.sync.zones} zones and ${response.sync.domains} domains.`
              : '';
            const successMsg = `Cloudflare account replaced successfully!${syncInfo}`;

            // Set pending notice flash for smooth shimmer → success transition
            setPendingNoticeFlash('success');

            showStatus('success', successMsg);
            showGlobalMessage('success', successMsg);

            if (submitBtn) {
              submitBtn.classList.remove('btn--cf');
              submitBtn.classList.add('btn--success');
              submitBtn.innerHTML = '<span class="icon" data-icon="mono/check-circle"></span><span>Connected!</span>';
            }

            setTimeout(async () => {
              if (drawer) drawer.setAttribute('hidden', '');
              try {
                const { loadIntegrations } = await import('@ui/integrations');
                await loadIntegrations();
              } catch (error) {
                console.error('Failed to reload integrations:', error);
                window.location.reload();
              }
            }, 2000);

          } catch (retryError: any) {
            // Loading indicator hidden automatically by apiFetch in finally block
            const retryErrorMessage = getErrorMessage(retryError);

            // Set pending notice flash for smooth shimmer → error transition
            setPendingNoticeFlash('error');

            showStatus('error', retryErrorMessage);
            showGlobalMessage('error', retryErrorMessage);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span class="icon" data-icon="brand/cloudflare"></span><span>Save &amp; verify token</span>';
            }
          }
        } else {
          // User cancelled
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="icon" data-icon="brand/cloudflare"></span><span>Save &amp; verify token</span>';
          }
        }
        return;
      }

      // Handle other errors
      const errorMessage = getErrorMessage(error);

      // Set pending notice flash for smooth shimmer → error transition
      setPendingNoticeFlash('error');

      showStatus('error', errorMessage);
      showGlobalMessage('error', errorMessage);

      // Log additional context for debugging
      if (body?.context) {
        console.error('[cf-connect] Error context:', body.context);
      }

      // Reset button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="icon" data-icon="brand/cloudflare"></span><span>Save &amp; verify token</span>';
      }
    }
  });

  function showStatus(type: 'error' | 'success', message: string) {
    const statusEl = form.querySelector('[data-cf-status]');
    if (!statusEl) return;

    statusEl.classList.remove('panel--danger', 'panel--success');
    statusEl.classList.add(type === 'error' ? 'panel--danger' : 'panel--success');
    statusEl.textContent = message;
    statusEl.removeAttribute('hidden');
  }
}

/**
 * Initialize Quick Setup form
 */
export function initCfQuickSetupForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-form="cf-connect-quick"]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const email = formData.get('cf_account_email') as string;
    const globalKey = formData.get('cf_global_key') as string;

    console.log('Submitting Quick Setup:', { email, globalKey: globalKey.substring(0, 10) + '...' });

    // TODO: Implement API call to backend
    // await connectCloudflareQuick({ email, globalKey });

    // Show success message
    const statusEl = form.querySelector('[data-cf-status]');
    if (statusEl) {
      statusEl.classList.remove('panel--danger');
      statusEl.classList.add('panel--success');
      statusEl.textContent = 'Scoped token created successfully! Global API Key has been discarded.';
      statusEl.removeAttribute('hidden');
    }
  });
}

/**
 * Initialize all CF connect forms
 */
export function initCfConnectForms(): void {
  initCfScopedTokenForm();
  initCfQuickSetupForm();
}
