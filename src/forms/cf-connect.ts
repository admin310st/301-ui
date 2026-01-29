/**
 * Cloudflare Connect form handler
 */

import { showGlobalMessage } from '@ui/notifications';
import { setPendingNoticeFlash } from '@ui/loading-indicator';
import { showConfirmDialog } from '@ui/dialog';
import { safeCall, type NormalizedError } from '@api/ui-client';
import { getIntegrationErrorMessage } from '@utils/api-errors';

/**
 * Parse Cloudflare test curl command and extract account ID and token
 * Example input:
 * curl "https://api.cloudflare.com/client/v4/accounts/6b1cc51fa359c59384677a156ad32c10/tokens/verify" \
 * -H "Authorization: Bearer y3DesLcDCtEfgz54jIBb0a2xDnPa_HtoMKrHZPGK"
 */
function parseCurlCommand(curlText: string): { accountId: string; token: string } | null {
  try {
    // Extract account ID from URL (32 hex characters)
    const accountIdMatch = curlText.match(/accounts\/([a-f0-9]{32})/i);

    // Extract token from Authorization header (40 characters: letters, numbers, underscore, dash)
    const tokenMatch = curlText.match(/Bearer\s+([A-Za-z0-9_-]{40})/);

    if (accountIdMatch && tokenMatch) {
      return {
        accountId: accountIdMatch[1],
        token: tokenMatch[1],
      };
    }

    return null;
  } catch (error) {
    console.error('[parseCurl] Error:', error);
    return null;
  }
}

/**
 * Initialize Cloudflare Connect form
 */
export function initCfConnectForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-form="cf-connect"]');
  if (!form) return;

  const accountIdInput = form.querySelector<HTMLInputElement>('[name="cf_account_id"]');
  const tokenTextarea = form.querySelector<HTMLTextAreaElement>('[name="cf_bootstrap_token"]');

  if (!tokenTextarea || !accountIdInput) return;

  // Auto-parse curl command when pasted into token field
  tokenTextarea.addEventListener('paste', (event) => {
    // Give the paste event time to complete
    setTimeout(() => {
      const pastedText = tokenTextarea.value;

      // Check if it looks like a curl command
      if (pastedText.includes('curl') && pastedText.includes('accounts/') && pastedText.includes('Bearer')) {
        const parsed = parseCurlCommand(pastedText);

        if (parsed) {
          // Auto-fill the fields
          accountIdInput.value = parsed.accountId;
          tokenTextarea.value = parsed.token;

          // Show success message
          showGlobalMessage('success', 'Curl command parsed! Account ID and token extracted automatically.');

          // Trigger validation/visual feedback
          accountIdInput.dispatchEvent(new Event('input', { bubbles: true }));
          tokenTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          showGlobalMessage('error', 'Failed to parse curl command. Please paste Account ID and token separately.');
        }
      }
    }, 10);
  });

  // Form submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get button reference and disable immediately to prevent double-submit
    const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"][form="cf-connect"]');
    const drawer = document.querySelector<HTMLElement>('[data-drawer="connect-cloudflare"]');

    if (submitBtn) {
      // Prevent double-click race condition
      if (submitBtn.disabled) {
        return;
      }
      submitBtn.disabled = true;
      submitBtn.setAttribute('data-turnstile-pending', '');
    }

    const formData = new FormData(form);
    const accountId = formData.get('cf_account_id') as string;
    const token = formData.get('cf_bootstrap_token') as string;

    // Validate presence
    if (!accountId || !token) {
      showStatus('error', 'Please fill in both Account ID and Bootstrap Token');
      resetButton(submitBtn);
      return;
    }

    // Validate Account ID format (32 hex characters)
    if (!/^[a-f0-9]{32}$/i.test(accountId.trim())) {
      showStatus('error', 'Invalid Account ID format. Must be 32 hexadecimal characters (example: 2465945243a36d6fbbbefef7ca64cccd)');
      resetButton(submitBtn);
      return;
    }

    // Validate Token format (40 characters: letters, numbers, underscore, dash)
    const trimmedToken = token.trim();
    if (!/^[A-Za-z0-9_-]{40}$/.test(trimmedToken)) {
      showStatus('error', 'Invalid Bootstrap Token format. Must be exactly 40 characters (example: 4JbTBRPa0h4MF3NVB6mVJjTGoKiHgXPw6ppbLI8C)');
      resetButton(submitBtn);
      return;
    }

    try {
      const { initCloudflare } = await import('@api/integrations');
      const response = await safeCall(
        () => initCloudflare({
          cf_account_id: accountId.trim(),
          bootstrap_token: trimmedToken,
        }),
        {
          lockKey: 'cf-init',
          retryOn401: true,
        }
      );

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
        submitBtn.removeAttribute('data-turnstile-pending');
        submitBtn.classList.remove('btn--cf');
        submitBtn.classList.add('btn--success');
        submitBtn.innerHTML = '<span class="icon" data-icon="mono/check-circle"></span><span>Connected!</span>';
      }

      // Close drawer and refresh page after delay (allow time for notification animation)
      setTimeout(async () => {
        if (drawer) {
          drawer.setAttribute('hidden', '');
        }

        // Check if we're on integrations page (has integrations table)
        const isIntegrationsPage = document.querySelector('[data-integrations-tbody]');

        if (isIntegrationsPage) {
          // Reload integrations table
          const { loadIntegrations } = await import('@ui/integrations');
          await loadIntegrations();
        } else {
          // On other pages (dashboard, etc.) - full reload to show updated state
          window.location.reload();
        }
      }, 3500);

    } catch (error: unknown) {
      console.error('[cf-connect] Error:', error);

      const normalized = error as NormalizedError;

      // Check for cf_account_conflict in details
      if (normalized.details && typeof normalized.details === 'object') {
        const details = normalized.details as { error?: string; context?: { existing_account_id?: string; new_account_id?: string } };

        if (details.error === 'cf_account_conflict') {
          const context = details.context || {};

          // Show custom dialog instead of browser confirm()
          const confirmed = await showConfirmDialog('replace-cf-account', {
            'existing-account-id': context.existing_account_id || 'existing account',
            'new-account-id': context.new_account_id || 'this account',
          });

          if (confirmed) {
            // Retry with confirm_replace flag
            await handleReplaceConfirmation(accountId.trim(), trimmedToken, submitBtn, drawer);
          } else {
            // User cancelled
            resetButton(submitBtn);
          }
          return;
        }
      }

      // Handle other errors
      const errorMessage = getIntegrationErrorMessage(error);

      // Set pending notice flash for smooth shimmer → error transition
      setPendingNoticeFlash('error');

      showStatus('error', errorMessage);
      showGlobalMessage('error', errorMessage);

      resetButton(submitBtn);
    }
  });

  function showStatus(type: 'error' | 'success', message: string) {
    if (!form) return;
    const statusEl = form.querySelector('[data-cf-status]');
    if (!statusEl) return;

    statusEl.classList.remove('panel--danger', 'panel--success');
    statusEl.classList.add(type === 'error' ? 'panel--danger' : 'panel--success');
    statusEl.textContent = message;
    statusEl.removeAttribute('hidden');
  }

  function resetButton(btn: HTMLButtonElement | null) {
    if (!btn) return;
    btn.removeAttribute('data-turnstile-pending');
    btn.disabled = false;
    btn.classList.remove('btn--success');
    btn.classList.add('btn--cf');
    btn.innerHTML = '<span class="icon" data-icon="brand/cloudflare"></span><span>Save &amp; verify token</span>';
  }
}

/**
 * Handle confirm_replace retry after cf_account_conflict
 */
async function handleReplaceConfirmation(
  accountId: string,
  token: string,
  submitBtn: HTMLButtonElement | null,
  drawer: HTMLElement | null
): Promise<void> {
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.setAttribute('data-turnstile-pending', '');
  }

  try {
    const { initCloudflare } = await import('@api/integrations');
    const response = await safeCall(
      () => initCloudflare({
        cf_account_id: accountId,
        bootstrap_token: token,
        confirm_replace: true,
      }),
      {
        lockKey: 'cf-init-replace',
        retryOn401: true,
      }
    );

    const syncInfo = response.sync
      ? ` Synced ${response.sync.zones} zones and ${response.sync.domains} domains.`
      : '';
    const successMsg = `Cloudflare account replaced successfully!${syncInfo}`;

    // Set pending notice flash for smooth shimmer → success transition
    setPendingNoticeFlash('success');

    showGlobalMessage('success', successMsg);

    if (submitBtn) {
      submitBtn.removeAttribute('data-turnstile-pending');
      submitBtn.classList.remove('btn--cf');
      submitBtn.classList.add('btn--success');
      submitBtn.innerHTML = '<span class="icon" data-icon="mono/check-circle"></span><span>Connected!</span>';
    }

    setTimeout(async () => {
      if (drawer) drawer.setAttribute('hidden', '');

      // Check if we're on integrations page (has integrations table)
      const isIntegrationsPage = document.querySelector('[data-integrations-tbody]');

      if (isIntegrationsPage) {
        // Reload integrations table
        const { loadIntegrations } = await import('@ui/integrations');
        await loadIntegrations();
      } else {
        // On other pages (dashboard, etc.) - full reload to show updated state
        window.location.reload();
      }
    }, 3500);

  } catch (retryError: unknown) {
    const retryErrorMessage = getIntegrationErrorMessage(retryError);

    // Set pending notice flash for smooth shimmer → error transition
    setPendingNoticeFlash('error');

    showGlobalMessage('error', retryErrorMessage);

    if (submitBtn) {
      submitBtn.removeAttribute('data-turnstile-pending');
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn--success');
      submitBtn.classList.add('btn--cf');
      submitBtn.innerHTML = '<span class="icon" data-icon="brand/cloudflare"></span><span>Save &amp; verify token</span>';
    }
  }
}

/**
 * Initialize CF connect form (main entry point)
 */
export function initCfConnectForms(): void {
  initCfConnectForm();
}
