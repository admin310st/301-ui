import { t } from '@i18n';
import { setFormState, qs } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
import { setNextPageNotice } from '@ui/globalNotice';
import { initCloudflare } from '@api/integrations';

async function handleManualSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const accountId = qs<HTMLInputElement>('[name="cf_account_id"]', form)?.value.trim();
  const bootstrapToken = qs<HTMLTextAreaElement>('[name="cf_bootstrap_token"]', form)?.value.trim();

  if (!accountId || !bootstrapToken) {
    setFormState(form, 'error', t('cf.wizard.statusMissing'));
    return;
  }

  setFormState(form, 'pending', t('cf.wizard.statusPending'));

  try {
    const response = await initCloudflare({
      cf_account_id: accountId,
      bootstrap_token: bootstrapToken,
    });

    // Show success message with sync info
    const syncInfo = response.sync
      ? ` Synced ${response.sync.zones} zones and ${response.sync.domains} domains.`
      : '';
    const successMsg = response.is_rotation
      ? `Cloudflare token rotated successfully.${syncInfo}`
      : `Cloudflare account connected successfully.${syncInfo}`;

    setFormState(form, 'success', successMsg);
    setNextPageNotice('success', successMsg);

    // Redirect to integrations page to view the new integration
    setTimeout(() => {
      window.location.href = '/integrations.html';
    }, 2000);
  } catch (error: any) {
    // Handle 409 conflict (different CF account on free plan)
    const errorBody = error.body || {};
    if (error.status === 409 && errorBody.error === 'cf_account_conflict') {
      const context = errorBody.context || {};
      const existingId = context.existing_account_id || 'unknown';
      const newId = context.new_account_id || accountId;

      const confirmReplace = confirm(
        `You already have a different Cloudflare account connected (${existingId}).\n\n` +
        `Do you want to replace it with the new account (${newId})?\n\n` +
        `This will remove the existing integration and create a new one.`
      );

      if (confirmReplace) {
        // Retry with confirm_replace flag
        try {
          const response = await initCloudflare({
            cf_account_id: accountId,
            bootstrap_token: bootstrapToken,
            confirm_replace: true,
          });

          const syncInfo = response.sync
            ? ` Synced ${response.sync.zones} zones and ${response.sync.domains} domains.`
            : '';
          const successMsg = `Cloudflare account replaced successfully.${syncInfo}`;

          setFormState(form, 'success', successMsg);
          setNextPageNotice('success', successMsg);

          setTimeout(() => {
            window.location.href = '/integrations.html';
          }, 2000);
        } catch (retryError: any) {
          const retryErrorBody = retryError.body || {};
          const errorMessage = retryError.message || retryErrorBody.error || 'Failed to replace account';
          setFormState(form, 'error', errorMessage);
          showGlobalMessage('error', `Failed to replace Cloudflare account: ${errorMessage}`);
        }
      } else {
        setFormState(form, 'error', 'Account replacement cancelled');
      }
      return;
    }

    // Handle other errors
    const errorMessage = error.message || errorBody.error || 'Unknown error occurred';
    setFormState(form, 'error', errorMessage);
    showGlobalMessage('error', `Failed to connect Cloudflare: ${errorMessage}`);
  }
}

async function handleGlobalSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  showGlobalMessage('info', 'Global API Key method is not yet implemented in the backend.');
  setFormState(form, 'error', 'This method is not available yet. Please use Scoped Token method.');
}

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

export function initCloudflareWizard(): void {
  // Manual token method (Scoped Token)
  document.querySelectorAll<HTMLFormElement>('form[data-form="cf-bootstrap-manual"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleManualSubmit);

    // Auto-parse curl command when pasted into token field
    const accountIdInput = qs<HTMLInputElement>('[name="cf_account_id"]', form);
    const tokenTextarea = qs<HTMLTextAreaElement>('[name="cf_bootstrap_token"]', form);

    if (tokenTextarea && accountIdInput) {
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
    }
  });

  // Global API Key method (not implemented yet)
  document.querySelectorAll<HTMLFormElement>('form[data-form="cf-bootstrap-global"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleGlobalSubmit);
  });
}
