import { setFormState, qs } from '@ui/dom';
import { getTurnstileToken, resetTurnstile, TURNSTILE_REQUIRED_MESSAGE } from '../turnstile';

async function handleBootstrapSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;

  const accountId = qs<HTMLInputElement>('[name="cf_account_id"]', form)?.value.trim();
  const bootstrapToken = qs<HTMLTextAreaElement>('[name="cf_bootstrap_token"]', form)?.value.trim();

  if (!accountId || !bootstrapToken) {
    setFormState(form, 'error', 'Заполните Account ID и Bootstrap Token.');
    return;
  }

  const tsToken = getTurnstileToken(form);
  if (!tsToken) {
    setFormState(form, 'error', TURNSTILE_REQUIRED_MESSAGE);
    return;
  }

  setFormState(form, 'pending', 'Проверяем токен...');

  const payload = {
    cf_account_id: accountId,
    cf_bootstrap_token: bootstrapToken,
    turnstile_token: tsToken,
  };

  console.log('Stub: Cloudflare bootstrap payload', payload);
  setFormState(
    form,
    'success',
    'Stub: payload logged, ready to wire to /auth/integrations/cloudflare/bootstrap'
  );
}

export function initCloudflareWizard(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-form="cf-bootstrap"]').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleBootstrapSubmit);
  });
}
