import { t } from '@i18n';
import { setFormState, qs } from '@ui/dom';
import { showGlobalMessage } from '@ui/notifications';
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
    const keyId = await initCloudflare({
      cf_account_id: accountId,
      bootstrap_token: bootstrapToken,
    });

    setFormState(form, 'success', t('cf.wizard.statusSuccess'));
    showGlobalMessage('success', `Cloudflare integration created! (Key ID: ${keyId})`);

    // Redirect to integrations page to view the new integration
    setTimeout(() => {
      window.location.href = '/integrations.html';
    }, 2000);
  } catch (error: any) {
    const errorMessage = error.message || error.error || 'Unknown error occurred';
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

export function initCloudflareWizard(): void {
  // Manual token method (Scoped Token)
  document.querySelectorAll<HTMLFormElement>('form[data-form="cf-bootstrap-manual"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleManualSubmit);
  });

  // Global API Key method (not implemented yet)
  document.querySelectorAll<HTMLFormElement>('form[data-form="cf-bootstrap-global"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleGlobalSubmit);
  });
}
