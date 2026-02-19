/**
 * NameCheap Connect form
 */

import { safeCall, type NormalizedError } from '@api/ui-client';
import { invalidateCache } from '@api/cache';
import { showGlobalMessage } from '@ui/notifications';
import { getIntegrationErrorMessage } from '@utils/api-errors';

/**
 * Format IP whitelist error message
 */
function formatIpWhitelistError(ipsString: string, message: string): string {
  // Parse comma-separated IP string
  const ips = ipsString.split(',').map(ip => ip.trim()).filter(Boolean);
  const ipList = ips.map(ip => `• ${ip}`).join('\n');

  return `${message}

Required IPs:
${ipList}

To whitelist these IPs:
1. Go to NameCheap Dashboard → Profile → Tools → API Access
2. Add each IP address to the "Whitelisted IPs" section
3. Save changes and try connecting again`;
}

/**
 * Load and display proxy IPs in the instructions tab
 */
export async function loadProxyIps(): Promise<void> {
  const ipsEl = document.querySelector('[data-nc-proxy-ips]');
  if (!ipsEl) return;

  try {
    const { getNamecheapProxyIps } = await import('@api/integrations');
    const ips = await safeCall(
      () => getNamecheapProxyIps(),
      { lockKey: 'nc-proxy-ips', retryOn401: true }
    );

    ipsEl.innerHTML = ips.map(ip => `<code>${ip}</code>`).join(', ');
    ipsEl.classList.remove('text-muted');
  } catch {
    ipsEl.innerHTML = '<span class="text-danger">Failed to load IPs</span>';
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

    const formData = new FormData(form);
    const username = formData.get('username') as string;
    const apiKey = formData.get('api_key') as string;
    const keyAlias = (formData.get('key_alias') as string) || `${username} - NameCheap`;

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
      await safeCall(
        () => initNamecheap({
          username,
          api_key: apiKey,
          key_alias: keyAlias,
        }),
        { lockKey: 'nc-connect', retryOn401: true }
      );
      // Loading indicator managed by initNamecheap() automatically

      // Invalidate integration keys cache after successful creation
      invalidateCache('integration-keys');

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

        // Check if we're on integrations page
        const isIntegrationsPage = document.querySelector('[data-integrations-tbody]');

        if (isIntegrationsPage) {
          // Reload integrations table in-place
          try {
            const { loadIntegrations } = await import('@ui/integrations');
            await loadIntegrations();
          } catch (error) {
            console.error('Failed to reload integrations:', error);
            window.location.reload();
          }
        } else {
          // Navigate to integrations page to see results
          window.location.href = '/integrations.html';
        }

        // Reset button state after drawer closes
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('btn--success');
          submitBtn.classList.add('btn--primary');
          submitBtn.innerHTML = '<span class="icon" data-icon="mono/check"></span><span>Connect NameCheap</span>';
        }
      }, 2000);

    } catch (error: unknown) {
      console.error('[nc-connect] Error:', error);

      const normalized = error as NormalizedError;
      const details = normalized.details as { error?: string; message?: string; ips?: string } | null;

      // Handle ip_not_whitelisted - show IPs in status panel
      if (details?.error === 'ip_not_whitelisted') {
        const ipsString = details.ips;
        const message = details.message || 'Add these IPs to your Namecheap API whitelist';

        if (ipsString) {
          const ipMessage = formatIpWhitelistError(ipsString, message);
          showStatus('error', ipMessage);
        } else {
          showStatus('error', message);
        }

        // Reset button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="icon" data-icon="brand/namecheap"></span><span>Connect NameCheap</span>';
        }
        return;
      }

      // Handle other errors
      const errorMessage = getIntegrationErrorMessage(error);
      showStatus('error', errorMessage);
      showGlobalMessage('error', errorMessage);

      // Reset button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="icon" data-icon="brand/namecheap"></span><span>Connect NameCheap</span>';
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
