/**
 * NameCheap Connect form
 */

import { showGlobalMessage } from '@ui/notifications';
import type { ApiErrorResponse } from '@api/types';
import type { ApiError } from '@utils/errors';

/**
 * Get user-friendly error message from API error response
 */
function getErrorMessage(error: ApiError<unknown>): string {
  const body = error.body as ApiErrorResponse | null;

  if (!body || typeof body !== 'object') {
    return error.message || 'Failed to connect NameCheap account';
  }

  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'invalid_credentials': 'Invalid NameCheap username or API key. Please check your credentials.',
    'api_key_expired': 'API key has expired. Please generate a new API key.',
    'api_disabled': 'API access is not enabled for your NameCheap account. Please enable it in your account settings.',
    'quota_exceeded': 'You have reached the maximum number of NameCheap accounts for your plan.',
    'nc_api_error': 'NameCheap API error. Please check your credentials and try again.',
    'nc_unavailable': 'NameCheap API is temporarily unavailable. Please try again later.',
  };

  const userMessage = errorMessages[body.error] || body.message || body.error;
  return userMessage;
}

/**
 * Format IP whitelist error message
 */
function formatIpWhitelistError(ips: string[]): string {
  const ipList = ips.map(ip => `• ${ip}`).join('\n');
  return `IP Whitelist Required

NameCheap requires you to whitelist the following IP addresses in your API settings:

${ipList}

To whitelist these IPs:
1. Go to NameCheap Dashboard → Profile → Tools → API Access
2. Add each IP address to the "Whitelisted IPs" section
3. Save changes and try connecting again`;
}

/**
 * Hide loading spinner
 */
function hideLoading(): void {
  const loadingIndicator = document.querySelector('[data-loading="brand"]');
  if (loadingIndicator) {
    loadingIndicator.setAttribute('hidden', '');
  }
}

/**
 * Initialize NameCheap Connect form
 */
export function initNcConnectForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-form="nc-connect"]');
  if (!form) return;

  // Form submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[nc-connect] NameCheap form submitted');

    const formData = new FormData(form);
    const username = formData.get('username') as string;
    const apiKey = formData.get('api_key') as string;
    const keyAlias = (formData.get('key_alias') as string) || `${username} - NameCheap`;

    console.log('[nc-connect] Data:', { username, keyAlias, apiKeyLength: apiKey?.length });

    if (!username || !apiKey) {
      showStatus('error', 'Please fill in both Username and API Key');
      return;
    }

    const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"][form="nc-connect-form"]');
    const drawer = document.querySelector<HTMLElement>('[data-drawer="connect-namecheap"]');

    // Show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="icon" data-icon="mono/refresh"></span><span>Verifying...</span>';
    }

    try {
      const { initNamecheap } = await import('@api/integrations');
      const keyId = await initNamecheap({
        username,
        api_key: apiKey,
        key_alias: keyAlias,
      });
      // Loading indicator managed by initNamecheap() automatically

      console.log('[nc-connect] Connected successfully, key_id:', keyId);

      const successMsg = 'NameCheap account connected successfully!';
      showStatus('success', successMsg);
      showGlobalMessage('success', successMsg);

      // Update button to success state
      if (submitBtn) {
        submitBtn.classList.remove('btn--primary');
        submitBtn.classList.add('btn--success');
        submitBtn.innerHTML = '<span class="icon" data-icon="mono/check-circle"></span><span>Connected!</span>';
      }

      // Close drawer and refresh integrations after 2 seconds
      setTimeout(async () => {
        if (drawer) {
          drawer.setAttribute('hidden', '');
        }

        // Reset form
        form.reset();

        // Reload integrations to show new NameCheap integration
        try {
          const { loadIntegrations } = await import('@ui/integrations');
          await loadIntegrations();
        } catch (error) {
          // Fallback: reload page
          console.error('Failed to reload integrations:', error);
          window.location.reload();
        }

        // Reset button state after drawer closes
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('btn--success');
          submitBtn.classList.add('btn--primary');
          submitBtn.innerHTML = '<span class="icon" data-icon="mono/save"></span><span>Connect NameCheap</span>';
        }
      }, 2000);

    } catch (error: any) {
      hideLoading();

      console.error('[nc-connect] Error:', error);

      const body = error.body as ApiErrorResponse | null;

      // Handle ip_not_whitelisted - show IPs in status panel
      if (body?.error === 'ip_not_whitelisted') {
        const context = body.context as { required_ips?: string[] };
        const ips = context?.required_ips || [];

        if (ips.length > 0) {
          const ipMessage = formatIpWhitelistError(ips);
          showStatus('error', ipMessage);
          console.error('[nc-connect] IP whitelist required:', ips);
        } else {
          showStatus('error', 'IP whitelist required. Please add your server IPs to NameCheap API settings.');
        }

        // Reset button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="icon" data-icon="mono/save"></span><span>Connect NameCheap</span>';
        }
        return;
      }

      // Handle other errors
      const errorMessage = getErrorMessage(error);
      showStatus('error', errorMessage);
      showGlobalMessage('error', errorMessage);

      // Log additional context for debugging
      if (body?.context) {
        console.error('[nc-connect] Error context:', body.context);
      }

      // Reset button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="icon" data-icon="mono/save"></span><span>Connect NameCheap</span>';
      }
    }
  });

  /**
   * Show status message in drawer
   */
  function showStatus(type: 'error' | 'success', message: string): void {
    const statusEl = form.querySelector('[data-nc-status]');
    if (!statusEl) return;

    statusEl.classList.remove('panel--danger', 'panel--success');
    statusEl.classList.add(type === 'error' ? 'panel--danger' : 'panel--success');

    // Preserve line breaks for IP whitelist error
    statusEl.innerHTML = message.replace(/\n/g, '<br>');
    statusEl.removeAttribute('hidden');
  }
}
