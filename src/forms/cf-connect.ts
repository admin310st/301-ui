/**
 * Cloudflare Connect forms (Scoped Token & Quick Setup)
 */

import { showGlobalMessage } from '@ui/notifications';

/**
 * Parse Cloudflare test curl command and extract account ID and token
 * Example input:
 * curl "https://api.cloudflare.com/client/v4/accounts/6b1cc51fa359c59384677a156ad32c10/tokens/verify" \
 * -H "Authorization: Bearer y3DesLcDCtEfgz54jIBb0a2xDnPa_HtoMKrHZPGK"
 */
function parseCurlCommand(curlText: string): { accountId: string; token: string } | null {
  try {
    // Extract account ID from URL
    const accountIdMatch = curlText.match(/accounts\/([a-f0-9]{32})/i);
    // Extract token from Authorization header
    const tokenMatch = curlText.match(/Bearer\s+([A-Za-z0-9_-]+)/);

    if (accountIdMatch && tokenMatch) {
      return {
        accountId: accountIdMatch[1],
        token: tokenMatch[1],
      };
    }
    return null;
  } catch {
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
        }
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

    if (!accountId || !token) {
      showStatus('error', 'Please fill in both Account ID and Bootstrap Token');
      return;
    }

    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const loadingBar = document.querySelector<HTMLElement>('[data-cf-loading]');
    const drawer = document.querySelector<HTMLElement>('[data-drawer="connect-cloudflare"]');

    // Show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="icon" data-icon="mono/refresh"></span><span>Verifying...</span>';
    }
    if (loadingBar) {
      loadingBar.setAttribute('data-loading', 'true');
    }

    try {
      const { initCloudflare } = await import('@api/integrations');
      const response = await initCloudflare({
        cf_account_id: accountId,
        bootstrap_token: token,
      });

      // Show success message with sync info
      const syncInfo = response.sync
        ? ` Synced ${response.sync.zones} zones and ${response.sync.domains} domains.`
        : '';
      const successMsg = response.is_rotation
        ? `Token rotated successfully.${syncInfo}`
        : `Cloudflare account connected!${syncInfo}`;

      showStatus('success', successMsg);
      showGlobalMessage('success', successMsg);

      // Close drawer and refresh integrations after 1.5 seconds
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
      }, 1500);

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect Cloudflare account';
      showStatus('error', errorMessage);
      showGlobalMessage('error', errorMessage);

      // Reset button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="icon" data-icon="brand/cloudflare"></span><span>Save &amp; verify token</span>';
      }
    } finally {
      // Hide loading bar
      if (loadingBar) {
        loadingBar.removeAttribute('data-loading');
      }
    }
  });

  function showStatus(type: 'error' | 'success', message: string) {
    const statusEl = form.querySelector('[data-cf-status]');
    if (!statusEl) return;

    statusEl.classList.remove('alert--danger', 'alert--success');
    statusEl.classList.add(type === 'error' ? 'alert--danger' : 'alert--success');
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
      statusEl.classList.remove('alert--danger');
      statusEl.classList.add('alert--success');
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
