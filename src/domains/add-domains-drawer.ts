/**
 * Add Domains Drawer
 *
 * Smart domain parser that extracts domains from raw text,
 * normalizes them, and provides preview before submission.
 * After submission, shows results with NS records for successful domains.
 */

import { showGlobalMessage } from '@ui/notifications';
import { formatDomainDisplay } from '@utils/idn';
import { showLoading, hideLoading } from '@ui/loading-indicator';
import { getIntegrations, type Integration } from '@api/integrations';
import { createZonesBatch, type BatchZoneResponse } from '@api/domains';

// Domain matching regex (updated for IDN TLD support)
// Matches: example.com, xn--domain.net, sub.domain.co.uk, домен.рф (xn--c1ad6a.xn--p1ai)
const DOMAIN_REGEX = /\b((?=[a-z0-9-]{1,63}\.)(?:xn--)?[a-z0-9]+(?:-[a-z0-9]+)*\.)+(?:xn--)?[a-z0-9-]{2,63}\b/gi;

interface ParsedDomainsState {
  raw: string;
  domains: string[];
  count: number;
}

type DrawerView = 'input' | 'results';

let currentState: ParsedDomainsState = {
  raw: '',
  domains: [],
  count: 0,
};

let currentView: DrawerView = 'input';
let lastResults: BatchZoneResponse | null = null;
let selectedIntegration: Integration | null = null;
let availableIntegrations: Integration[] = [];

/**
 * Initialize Add Domains Drawer
 */
export function initAddDomainsDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="add-domains"]');
  const rawInput = document.querySelector<HTMLTextAreaElement>('[data-add-raw-input]');
  const domainList = document.querySelector<HTMLElement>('[data-add-domain-list]');
  const emptyState = document.querySelector<HTMLElement>('[data-add-empty-state]');
  const foundCount = document.querySelector<HTMLElement>('[data-add-found-count]');
  const submitBtn = document.querySelector<HTMLButtonElement>('[data-add-submit]');
  const integrationSelect = document.querySelector<HTMLSelectElement>('[data-add-integration-select]');

  if (!drawer || !rawInput) return;

  // Load CF integrations when drawer opens
  loadCloudflareIntegrations();

  // Close drawer on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) {
      closeDrawer();
    }
  });

  // Close drawer on overlay click
  drawer.querySelectorAll('[data-drawer-close]').forEach((el) => {
    el.addEventListener('click', () => closeDrawer());
  });

  // Integration selection change
  integrationSelect?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    const integrationId = parseInt(target.value, 10);
    selectedIntegration = availableIntegrations.find(i => i.id === integrationId) || null;
    updateSubmitButton();
  });

  // Auto-parse on input with debounce
  let parseTimeout: ReturnType<typeof setTimeout>;
  rawInput.addEventListener('input', () => {
    clearTimeout(parseTimeout);
    parseTimeout = setTimeout(() => {
      parseDomains(rawInput.value);
      updatePreview();
      updateSubmitButton();
    }, 300);
  });

  // Submit handler
  submitBtn?.addEventListener('click', async () => {
    if (currentState.count === 0 || !selectedIntegration) return;

    submitBtn.disabled = true;
    showLoading('cf'); // Show orange shimmer for CF operations

    try {
      const results = await createZonesBatch({
        account_key_id: selectedIntegration.id,
        domains: currentState.domains,
      });

      hideLoading(); // Triggers shimmer → notice color transition

      // Switch to results view
      lastResults = results;
      switchToResultsView();

      // Show summary message
      const successCount = results.results.success.length;
      const failedCount = results.results.failed.length;

      if (failedCount === 0) {
        showGlobalMessage('success', `Successfully added ${successCount} domain(s)`);
      } else if (successCount === 0) {
        showGlobalMessage('danger', `Failed to add all ${failedCount} domain(s)`);
      } else {
        showGlobalMessage('info', `Added ${successCount} of ${successCount + failedCount} domains`);
      }
    } catch (error) {
      hideLoading();
      showGlobalMessage('danger', error instanceof Error ? error.message : 'Failed to add domains');
      submitBtn.disabled = false;
    }
  });

  /**
   * Load Cloudflare integrations
   */
  async function loadCloudflareIntegrations(): Promise<void> {
    const select = integrationSelect;
    if (!select) return;

    try {
      const allIntegrations = await getIntegrations();
      availableIntegrations = allIntegrations.filter(
        (i) => i.provider === 'cloudflare' && i.status === 'active'
      );

      if (availableIntegrations.length === 0) {
        // Show no integrations panel
        const noIntegrationsPanel = document.querySelector('[data-add-no-integrations]');
        if (noIntegrationsPanel) {
          noIntegrationsPanel.removeAttribute('hidden');
        }
        select.disabled = true;
        select.innerHTML = '<option value="">No Cloudflare accounts connected</option>';
        return;
      }

      // Populate select
      select.innerHTML = '<option value="">Select Cloudflare account...</option>';
      availableIntegrations.forEach((integration) => {
        const option = document.createElement('option');
        option.value = String(integration.id);
        option.textContent = integration.label || integration.account_name || `Account #${integration.id}`;
        select.appendChild(option);
      });

      // Auto-select if only one integration
      if (availableIntegrations.length === 1) {
        select.value = String(availableIntegrations[0].id);
        selectedIntegration = availableIntegrations[0];
        updateSubmitButton();
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
      select.innerHTML = '<option value="">Failed to load integrations</option>';
      select.disabled = true;
    }
  }

  /**
   * Parse domains from raw text
   */
  function parseDomains(text: string): void {
    currentState.raw = text;

    if (!text.trim()) {
      currentState.domains = [];
      currentState.count = 0;
      return;
    }

    // Extract all domain matches
    const matches = text.match(DOMAIN_REGEX) || [];

    // Normalize: lowercase, dedupe, sort
    const normalized = [...new Set(matches.map((d) => d.toLowerCase().trim()))].sort();

    currentState.domains = normalized;
    currentState.count = normalized.length;
  }

  /**
   * Update preview UI
   */
  function updatePreview(): void {
    if (!domainList || !emptyState || !foundCount) return;

    // Update count
    foundCount.textContent = String(currentState.count);

    if (currentState.count === 0) {
      // Show empty state
      emptyState.hidden = false;
      domainList.hidden = true;
    } else {
      // Show domain list
      emptyState.hidden = true;
      domainList.hidden = false;

      // Render domains
      domainList.innerHTML = currentState.domains
        .map((domain) => `<div class="domain-preview-item">${formatDomainDisplay(domain)}</div>`)
        .join('');
    }
  }

  /**
   * Update submit button state
   */
  function updateSubmitButton(): void {
    if (!submitBtn) return;
    submitBtn.disabled = currentState.count === 0 || !selectedIntegration;
  }

  /**
   * Switch to results view
   */
  function switchToResultsView(): void {
    if (!lastResults) return;

    currentView = 'results';

    const inputView = document.querySelector('[data-add-input-view]');
    const resultsView = document.querySelector('[data-add-results-view]');
    const submitBtn = document.querySelector<HTMLButtonElement>('[data-add-submit]');

    if (inputView) inputView.setAttribute('hidden', '');
    if (resultsView) {
      resultsView.removeAttribute('hidden');
      renderResultsView(lastResults);
    }

    // Update footer button
    if (submitBtn) {
      submitBtn.setAttribute('hidden', '');
    }

    // Show results footer buttons
    renderResultsFooter();
  }

  /**
   * Switch back to input view
   */
  function switchToInputView(): void {
    currentView = 'input';
    lastResults = null;

    const inputView = document.querySelector('[data-add-input-view]');
    const resultsView = document.querySelector('[data-add-results-view]');
    const submitBtn = document.querySelector<HTMLButtonElement>('[data-add-submit]');

    if (inputView) inputView.removeAttribute('hidden');
    if (resultsView) resultsView.setAttribute('hidden', '');

    // Restore submit button
    if (submitBtn) {
      submitBtn.removeAttribute('hidden');
    }

    // Remove results footer
    const footer = drawer.querySelector('.drawer__footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn--primary" type="button" data-add-submit disabled>
          <span class="icon" data-icon="mono/plus"></span>
          <span>Add domains</span>
        </button>
        <button class="btn btn--ghost" type="button" data-drawer-close>Cancel</button>
      `;
    }

    // Reset state
    resetState();
  }

  /**
   * Render results view
   */
  function renderResultsView(results: BatchZoneResponse): void {
    const resultsView = document.querySelector('[data-add-results-view]');
    if (!resultsView) return;

    const successCount = results.results.success.length;
    const failedCount = results.results.failed.length;

    let html = '';

    // Summary panel
    html += `
      <div class="panel ${failedCount === 0 ? 'panel--success' : failedCount > 0 && successCount > 0 ? 'panel--info' : 'panel--danger'}">
        <p class="text-sm">
          ${successCount > 0 ? `<span class="icon" data-icon="mono/check-circle"></span> <strong>${successCount} domain(s) added successfully</strong>` : ''}
          ${failedCount > 0 ? `<br><span class="icon" data-icon="mono/alert-circle"></span> <strong>${failedCount} domain(s) failed</strong>` : ''}
        </p>
      </div>
    `;

    // Success list
    if (successCount > 0) {
      html += '<div class="stack-list">';
      html += '<h3 class="h5">✅ SUCCESS (' + successCount + ')</h3>';

      results.results.success.forEach((item) => {
        html += `
          <div class="card card--panel">
            <header class="card__header">
              <div class="cluster cluster--sm">
                <h4 class="h5">${formatDomainDisplay(item.domain)}</h4>
                <span class="badge badge--neutral">Zone #${item.zone_id}</span>
                <span class="badge badge--warning">Pending NS</span>
              </div>
            </header>
            <div class="card__body stack-sm">
              <p class="text-sm text-muted">Configure these nameservers at your registrar:</p>
              <div class="stack-xs">
                ${item.name_servers.map(ns => `<div class="text-sm"><code>${ns}</code></div>`).join('')}
              </div>

              <div class="cluster cluster--sm">
                <button class="btn btn--sm btn--ghost" data-copy-ns="${item.name_servers.join(',')}">
                  <span class="icon" data-icon="mono/copy"></span>
                  <span>Copy NS</span>
                </button>
                <button class="btn btn--sm btn--ghost" disabled title="Coming soon">
                  <span class="icon" data-icon="mono/web-sync"></span>
                  <span>Sync with registrar</span>
                </button>
              </div>

              <div class="panel panel--info">
                <p class="text-xs">
                  <span class="icon" data-icon="mono/info"></span>
                  NS verification may take 1-48 hours. We'll check automatically.
                </p>
              </div>
            </div>
          </div>
        `;
      });

      html += '</div>';
    }

    // Failed list
    if (failedCount > 0) {
      html += '<div class="stack-list">';
      html += '<h3 class="h5">❌ FAILED (' + failedCount + ')</h3>';

      results.results.failed.forEach((item) => {
        const hint = getErrorHint(item.error);

        html += `
          <div class="card card--panel">
            <header class="card__header">
              <div class="cluster cluster--sm">
                <span class="icon icon--danger" data-icon="mono/alert-circle"></span>
                <h4 class="h5">${formatDomainDisplay(item.domain)}</h4>
                <span class="badge badge--danger">Failed</span>
              </div>
            </header>
            <div class="card__body stack-sm">
              <p class="text-sm"><strong>Error:</strong> ${item.error}</p>
              <p class="text-sm text-muted">${item.error_message}</p>

              ${hint ? `
                <div class="panel panel--warning">
                  <p class="text-xs">
                    <span class="icon" data-icon="mono/lightbulb"></span>
                    <strong>Resolution:</strong> ${hint}
                  </p>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      });

      html += '</div>';
    }

    resultsView.innerHTML = html;

    // Attach copy handlers
    resultsView.querySelectorAll('[data-copy-ns]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const ns = target.getAttribute('data-copy-ns')?.split(',') || [];
        copyNameservers(ns);
      });
    });
  }

  /**
   * Render results footer
   */
  function renderResultsFooter(): void {
    const footer = drawer.querySelector('.drawer__footer');
    if (!footer) return;

    footer.innerHTML = `
      <button class="btn btn--primary" type="button" data-results-goto-domains>
        <span class="icon" data-icon="mono/arrow-right"></span>
        <span>Go to Domains</span>
      </button>
      <button class="btn btn--ghost" type="button" data-results-add-more>
        <span class="icon" data-icon="mono/plus"></span>
        <span>Add more domains</span>
      </button>
    `;

    // Attach handlers
    footer.querySelector('[data-results-goto-domains]')?.addEventListener('click', () => {
      closeDrawer();
      window.location.href = '/domains.html';
    });

    footer.querySelector('[data-results-add-more]')?.addEventListener('click', () => {
      switchToInputView();
    });
  }

  /**
   * Get user-friendly error hint
   */
  function getErrorHint(errorCode: string): string {
    const hints: Record<string, string> = {
      zone_already_in_cf: 'This domain is already in your Cloudflare account. Check your domains list.',
      zone_in_another_account:
        'Contact Cloudflare support to transfer the zone, or remove it from the other account first.',
      zone_banned: 'Contact Cloudflare support to resolve the block.',
      zone_held: 'Check domain status at your registrar.',
      not_registrable: 'Add the root domain instead (e.g., example.com instead of www.example.com).',
      quota_exceeded: 'Upgrade your plan or remove unused zones.',
    };

    return hints[errorCode] || 'Contact support for assistance.';
  }

  /**
   * Copy nameservers to clipboard
   */
  async function copyNameservers(ns: string[]): Promise<void> {
    const text = ns.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showGlobalMessage('success', 'Nameservers copied to clipboard');
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showGlobalMessage('success', 'Nameservers copied to clipboard');
    }
  }

  /**
   * Reset state
   */
  function resetState(): void {
    currentState = { raw: '', domains: [], count: 0 };
    if (rawInput) rawInput.value = '';
    updatePreview();
    updateSubmitButton();
  }

  /**
   * Close drawer and reset state
   */
  function closeDrawer(): void {
    drawer?.setAttribute('hidden', '');

    // Reset to input view on close
    if (currentView === 'results') {
      switchToInputView();
    } else {
      resetState();
    }
  }
}
