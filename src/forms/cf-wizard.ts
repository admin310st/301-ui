import { apiFetch } from '@api/client';
import { setFormState, qs, qsa } from '@ui/dom';
import { getTurnstileToken, resetTurnstile, TURNSTILE_REQUIRED_MESSAGE } from '../turnstile';

function setStep(root: HTMLElement, step: string): void {
  const steps = qsa<HTMLElement>('[data-step]', root);
  steps.forEach((item) => {
    const isActive = item.dataset.step === step;
    item.classList.toggle('is-active', isActive);
    item.toggleAttribute('aria-current', isActive);
  });

  const panels = qsa<HTMLElement>('[data-step-panel]', root);
  panels.forEach((panel) => {
    const isActive = panel.dataset.stepPanel === step;
    panel.classList.toggle('is-active', isActive);
    panel.toggleAttribute('hidden', !isActive);
  });
}

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

  try {
    await apiFetch('/integrations/cloudflare/bootstrap', {
      method: 'POST',
      body: JSON.stringify({
        cf_account_id: accountId,
        cf_bootstrap_token: bootstrapToken,
        turnstile_token: tsToken,
      }),
    });

    setFormState(form, 'success', 'Bootstrap токен сохранён и проверен.');
  } catch (error: any) {
    const code = error?.body?.code || error?.body?.error || error?.body?.message || 'integration_failed';

    if (code === 'turnstile_failed' || code === 'turnstile_required') {
      resetTurnstile(form);
    }

    setFormState(form, 'error', error?.body?.message || 'Не удалось проверить токен.');
  }
}

export function initCloudflareWizard(): void {
  const root = document.querySelector<HTMLElement>('[data-integrations-wizard="cloudflare"]');
  if (!root) return;

  setStep(root, '1');

  const stepLinks = qsa<HTMLElement>('[data-step]', root);
  stepLinks.forEach((step) => {
    if (step.dataset.bound === 'true') return;
    step.dataset.bound = 'true';
    step.addEventListener('click', (event) => {
      event.preventDefault();
      const targetStep = step.dataset.step;
      if (targetStep) setStep(root, targetStep);
    });
  });

  const form = root.querySelector<HTMLFormElement>('form[data-form="cf-bootstrap"]');
  if (form && form.dataset.bound !== 'true') {
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleBootstrapSubmit);
  }
}
