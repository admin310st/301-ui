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
import { getIntegrationKeys, type IntegrationKey } from '@api/integrations';
import { createZonesBatch, type BatchZoneResponse } from '@api/domains';
import { getAccountId } from '@state/auth-state';

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
let selectedIntegration: IntegrationKey | null = null;
let availableIntegrations: IntegrationKey[] = [];
let integrationsLoaded = false;

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
  const integrationButton = document.querySelector<HTMLButtonElement>('[data-add-integration-select]');

  if (!drawer || !rawInput) return;

  // Watch for drawer opening to load integrations lazily
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
        const isOpen = !drawer.hasAttribute('hidden');
        if (isOpen && !integrationsLoaded) {
          loadCloudflareIntegrations();
          integrationsLoaded = true;
        }
      }
    });
  });

  observer.observe(drawer, { attributes: true });

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
    const button = integrationButton;
    const label = button?.querySelector('[data-selected-label]');
    const menu = document.querySelector('[data-add-integration-menu]');

    if (!button || !label || !menu) return;

    try {
      const accountId = getAccountId();
      if (!accountId) {
        console.error('No account ID found');
        label.textContent = 'Not authenticated';
        button.disabled = true;
        return;
      }

      const allIntegrations = await getIntegrationKeys(accountId, 'cloudflare');
      availableIntegrations = allIntegrations.filter((i) => i.status === 'active');

      if (availableIntegrations.length === 0) {
        // Show no integrations panel
        const noIntegrationsPanel = document.querySelector('[data-add-no-integrations]');
        if (noIntegrationsPanel) {
          noIntegrationsPanel.removeAttribute('hidden');
        }
        button.disabled = true;
        label.textContent = 'No Cloudflare accounts connected';
        return;
      }

      // Populate dropdown menu
      label.textContent = 'Select Cloudflare account...';
      menu.innerHTML = availableIntegrations
        .map(
          (integration) => `
        <button
          class="dropdown__item"
          type="button"
          role="menuitem"
          data-integration-id="${integration.id}"
        >
          ${integration.key_alias || `Account #${integration.id}`}
        </button>
      `
        )
        .join('');

      // Attach handlers to dropdown items
      menu.querySelectorAll('[data-integration-id]').forEach((item) => {
        item.addEventListener('click', () => {
          const integrationId = parseInt(item.getAttribute('data-integration-id') || '0', 10);
          selectedIntegration = availableIntegrations.find((i) => i.id === integrationId) || null;

          if (selectedIntegration) {
            label.textContent = selectedIntegration.key_alias || `Account #${selectedIntegration.id}`;
            button.setAttribute('data-selected-value', String(selectedIntegration.id));

            // Update active state
            menu.querySelectorAll('.dropdown__item').forEach((i) => i.classList.remove('is-active'));
            item.classList.add('is-active');

            updateSubmitButton();
          }
        });
      });

      // Auto-select if only one integration
      if (availableIntegrations.length === 1) {
        const integration = availableIntegrations[0];
        selectedIntegration = integration;
        label.textContent = integration.key_alias || `Account #${integration.id}`;
        button.setAttribute('data-selected-value', String(integration.id));
        menu.querySelector('[data-integration-id]')?.classList.add('is-active');
        updateSubmitButton();
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
      label.textContent = 'Failed to load integrations';
      button.disabled = true;
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
    // Always query fresh button (it may be recreated after innerHTML)
    const btn = document.querySelector<HTMLButtonElement>('[data-add-submit]');
    if (!btn) return;
    btn.disabled = currentState.count === 0 || !selectedIntegration;
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
   * Group domains by nameserver pairs
   */
  function groupByNameservers(
    domains: BatchZoneSuccess[]
  ): Record<string, { ns: string[]; domains: BatchZoneSuccess[] }> {
    const groups: Record<string, { ns: string[]; domains: BatchZoneSuccess[] }> = {};

    domains.forEach((domain) => {
      const nsKey = domain.name_servers.join(',');

      if (!groups[nsKey]) {
        groups[nsKey] = {
          ns: domain.name_servers,
          domains: [],
        };
      }

      groups[nsKey].domains.push(domain);
    });

    // Sort groups by domain count (largest first)
    return Object.keys(groups)
      .sort((a, b) => groups[b].domains.length - groups[a].domains.length)
      .reduce((sorted, key) => {
        sorted[key] = groups[key];
        return sorted;
      }, {} as Record<string, { ns: string[]; domains: BatchZoneSuccess[] }>);
  }

  /**
   * Render results view
   */
  function renderResultsView(results: BatchZoneResponse): void {
    const resultsView = document.querySelector('[data-add-results-view]');
    if (!resultsView) return;

    const successCount = results.results.success.length;
    const failedCount = results.results.failed.length;
    const isMixed = successCount > 0 && failedCount > 0;

    let html = '';

    // Summary banner - compact style
    html += `
      <div class="panel ${isMixed ? 'panel--warning' : failedCount > 0 ? 'panel--danger' : 'panel--success'}">
        <div class="cluster cluster--xs">
          ${successCount > 0 ? `
            <span class="cluster cluster--xs">
              <span class="icon" data-icon="mono/check-circle"></span>
              <strong>${successCount}</strong> added
            </span>
          ` : ''}
          ${failedCount > 0 ? `
            <span class="cluster cluster--xs">
              <span class="icon" data-icon="mono/alert-circle"></span>
              <strong>${failedCount}</strong> failed
            </span>
          ` : ''}
        </div>
      </div>
    `;

    // Group success domains by NS pairs
    if (successCount > 0) {
      const nsGroups = groupByNameservers(results.results.success);
      const groupKeys = Object.keys(nsGroups);

      html += '<div class="stack-list">';

      // Render each NS group
      groupKeys.forEach((nsKey, index) => {
        const group = nsGroups[nsKey];

        html += `
          <div class="card card--panel">
            <header class="card__header">
              <h3 class="h5">Configure these nameservers at your registrar:</h3>
            </header>
            <div class="card__body stack-sm">
              <!-- NS List - each with copy icon -->
              <div class="stack-xs">
                ${group.ns.map(ns => `
                  <div class="cluster cluster--space-between">
                    <code class="text-sm">${ns}</code>
                    <button
                      class="btn-icon btn-icon--ghost btn-icon--sm"
                      data-copy-single-ns="${ns}"
                      title="Copy ${ns}"
                    >
                      <span class="icon" data-icon="mono/copy"></span>
                    </button>
                  </div>
                `).join('')}
              </div>

              <!-- Domains List -->
              <div class="cluster cluster--space-between">
                <p class="text-sm">${group.domains.map(d => formatDomainDisplay(d.domain)).join(', ')}</p>
                <button
                  class="btn-icon btn-icon--ghost btn-icon--sm"
                  data-copy-domains="${group.domains.map(d => d.domain).join(',')}"
                  title="Copy domain list"
                >
                  <span class="icon" data-icon="mono/copy"></span>
                </button>
              </div>
            </div>
          </div>
        `;
      });

      html += '</div>';

      // Common info panel for all NS groups
      html += `
        <div class="panel panel--info">
          <p class="text-sm">
            <span class="icon" data-icon="mono/info"></span>
            NS verification may take 1-48 hours. We'll check automatically.
          </p>
        </div>
      `;
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

    // Attach copy single NS handlers
    resultsView.querySelectorAll('[data-copy-single-ns]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const ns = target.getAttribute('data-copy-single-ns') || '';
        copySingleNameserver(ns, target);
      });
    });

    // Attach copy domains handlers
    resultsView.querySelectorAll('[data-copy-domains]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const domains = target.getAttribute('data-copy-domains')?.split(',') || [];
        copyDomainsList(domains, target);
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
      <button class="btn btn--ghost" type="button" data-drawer-close>Close</button>
    `;

    // Attach handlers
    footer.querySelector('[data-results-goto-domains]')?.addEventListener('click', () => {
      closeDrawer();
      window.location.href = '/domains.html';
    });

    footer.querySelector('[data-drawer-close]')?.addEventListener('click', () => {
      closeDrawer();
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
      not_registrable: 'Domain already exists in database or is a subdomain. Add root domain only (e.g., example.com, not www.example.com).',
      quota_exceeded: 'Upgrade your plan or remove unused zones.',
    };

    return hints[errorCode] || 'Contact support for assistance.';
  }

  /**
   * Copy single nameserver to clipboard
   */
  async function copySingleNameserver(ns: string, button?: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(ns);

      // Visual feedback - turn button green briefly
      if (button) {
        const originalClass = button.className;
        button.classList.add('btn-icon--success');
        setTimeout(() => {
          button.className = originalClass;
        }, 1500);
      }
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = ns;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * Copy domains list to clipboard
   */
  async function copyDomainsList(domains: string[], button?: HTMLButtonElement): Promise<void> {
    const text = domains.join('\n');

    try {
      await navigator.clipboard.writeText(text);

      // Visual feedback - turn button green briefly
      if (button) {
        const originalClass = button.className;
        button.classList.add('btn-icon--success');
        setTimeout(() => {
          button.className = originalClass;
        }, 1500);
      }
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

    // Reset state on close
    resetState();

    // Reset view
    if (currentView === 'results') {
      currentView = 'input';
      lastResults = null;

      const inputView = document.querySelector('[data-add-input-view]');
      const resultsView = document.querySelector('[data-add-results-view]');

      if (inputView) inputView.removeAttribute('hidden');
      if (resultsView) resultsView.setAttribute('hidden', '');
    }
  }
}
