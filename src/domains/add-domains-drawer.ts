/**
 * Add Domains Drawer
 *
 * Smart domain parser that extracts domains from raw text,
 * normalizes them, and provides preview before submission.
 * After submission, shows results with NS records for successful domains.
 */

import { showGlobalMessage } from '@ui/notifications';
import { formatDomainDisplay } from '@utils/idn';
import { getIntegrationKeys, type IntegrationKey } from '@api/integrations';
import { createZonesBatch, type BatchZoneResponse, type BatchZoneSuccess, type BatchZoneFailed } from '@api/domains';
import { syncZones } from '@api/zones';
import { getAccountId } from '@state/auth-state';
import { initDropdowns } from '@ui/dropdown';
import { t, tWithVars } from '@i18n';
import { safeCall, type NormalizedError } from '@api/ui-client';
import { invalidateCacheByPrefix } from '@api/cache';

/**
 * Extract cf_account_name from provider_scope JSON
 */
function getCfAccountName(integration: IntegrationKey): string | null {
  if (!integration.provider_scope) return null;
  try {
    const scope = JSON.parse(integration.provider_scope);
    return scope.cf_account_name || null;
  } catch {
    return null;
  }
}

/**
 * Format integration label with optional email in parentheses
 */
function formatIntegrationLabel(integration: IntegrationKey): string {
  const alias = integration.key_alias || `Account #${integration.id}`;
  const cfAccountName = getCfAccountName(integration);
  return cfAccountName ? `${alias} (${cfAccountName})` : alias;
}

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
  const syncBtn = document.querySelector<HTMLButtonElement>('[data-sync-zones]');

  if (!drawer || !rawInput) return;

  // Initialize dropdown behavior for integration selector
  initDropdowns(drawer);

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
    // Hide any inline error when user starts typing
    hideInlineError();
    parseTimeout = setTimeout(() => {
      parseDomains(rawInput.value);
      updatePreview();
      updateSubmitButton();
    }, 300);
  });

  // Sync button handler
  syncBtn?.addEventListener('click', async () => {
    if (!selectedIntegration) return;

    // Show loading state
    syncBtn.disabled = true;
    syncBtn.setAttribute('data-turnstile-pending', '');

    try {
      const result = await safeCall(
        () => syncZones(selectedIntegration!.id),
        {
          lockKey: `sync-zones-${selectedIntegration!.id}`,
          retryOn401: true,
        }
      );

      // Invalidate domains cache so table refreshes
      invalidateCacheByPrefix('domains');

      // Show success message with counts
      if (result.zones_synced > 0 || result.domains_synced > 0) {
        showGlobalMessage('success', `Synced! +${result.zones_synced} zones, +${result.domains_synced} domains`);
      } else {
        showGlobalMessage('info', 'No new zones found in this Cloudflare account');
      }
    } catch (error: unknown) {
      const normalized = error as NormalizedError;
      showGlobalMessage('danger', normalized.message || 'Failed to sync zones');
    } finally {
      // Restore button state
      syncBtn.removeAttribute('data-turnstile-pending');
      syncBtn.disabled = false;
    }
  });

  // Submit handler
  submitBtn?.addEventListener('click', async () => {
    if (currentState.count === 0 || !selectedIntegration) return;

    // Show loading state with shimmer effect (same as login button)
    submitBtn.disabled = true;
    submitBtn.setAttribute('data-turnstile-pending', '');

    try {
      // Note: createZonesBatch already shows loading via apiFetch
      const results = await safeCall(
        () => createZonesBatch({
          account_key_id: selectedIntegration!.id,
          domains: currentState.domains,
        }),
        {
          lockKey: `create-zones-batch-${selectedIntegration!.id}`,
          retryOn401: true,
        }
      );

      // Switch to results view
      lastResults = results;
      switchToResultsView();

      // Invalidate domains cache
      invalidateCacheByPrefix('domains');

      // Show summary message
      const successCount = results.results.success.length;
      const failedCount = results.results.failed.length;

      if (failedCount === 0) {
        showGlobalMessage('success', tWithVars('domains.add.results.allSuccess', { count: String(successCount) }));
      } else if (successCount === 0) {
        showGlobalMessage('danger', tWithVars('domains.add.results.allFailed', { count: String(failedCount) }));
      } else {
        showGlobalMessage('info', tWithVars('domains.add.results.partial', { success: String(successCount), total: String(successCount + failedCount) }));
      }
    } catch (error: unknown) {
      const normalized = error as NormalizedError;

      // Extract error code from NormalizedError details
      let errorMessage = t('domains.add.errors.fallback');

      if (normalized.details && typeof normalized.details === 'object' && 'error' in normalized.details) {
        // API returned structured error in details
        errorMessage = getGlobalErrorMessage((normalized.details as { error: string }).error);
      } else if (normalized.message) {
        errorMessage = normalized.message;
      }

      // Show error in both global notice and inline panel (for mobile)
      showGlobalMessage('danger', errorMessage);
      showInlineError(t('domains.status.error'), errorMessage);

      // Restore button state
      submitBtn.removeAttribute('data-turnstile-pending');
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
        label.textContent = t('domains.add.drawer.notAuthenticated');
        button.disabled = true;
        return;
      }

      const allIntegrations = await safeCall(
        () => getIntegrationKeys(accountId, 'cloudflare'),
        {
          lockKey: 'integrations:cloudflare',
          retryOn401: true,
        }
      );
      availableIntegrations = allIntegrations.filter((i) => i.status === 'active');

      if (availableIntegrations.length === 0) {
        // Show no integrations panel
        const noIntegrationsPanel = document.querySelector('[data-add-no-integrations]');
        if (noIntegrationsPanel) {
          noIntegrationsPanel.removeAttribute('hidden');
        }
        button.disabled = true;
        label.textContent = t('domains.add.drawer.noIntegrations.title');
        return;
      }

      // Populate dropdown menu
      label.textContent = t('domains.add.drawer.cfAccountSelect');
      menu.innerHTML = availableIntegrations
        .map(
          (integration) => `
        <button
          class="dropdown__item"
          type="button"
          role="menuitem"
          data-integration-id="${integration.id}"
        >
          ${formatIntegrationLabel(integration)}
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
            label.textContent = formatIntegrationLabel(selectedIntegration);
            button.setAttribute('data-selected-value', String(selectedIntegration.id));

            // Update active state
            menu.querySelectorAll('.dropdown__item').forEach((i) => i.classList.remove('is-active'));
            item.classList.add('is-active');

            // Close dropdown after selection
            const dropdown = button.closest('.dropdown, [data-dropdown]');
            if (dropdown) {
              dropdown.classList.remove('dropdown--open');
              button.setAttribute('aria-expanded', 'false');
            }

            // Enable sync button
            if (syncBtn) syncBtn.disabled = false;

            updateSubmitButton();
          }
        });
      });

      // Auto-select if only one integration
      if (availableIntegrations.length === 1) {
        const integration = availableIntegrations[0];
        selectedIntegration = integration;
        label.textContent = formatIntegrationLabel(integration);
        button.setAttribute('data-selected-value', String(integration.id));
        menu.querySelector('[data-integration-id]')?.classList.add('is-active');
        // Enable sync button
        if (syncBtn) syncBtn.disabled = false;
        updateSubmitButton();
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
      label.textContent = t('domains.add.drawer.failedToLoad');
      button.disabled = true;
    }
  }

  /**
   * Check if TLD contains at least one letter (ICANN requirement)
   * Numeric-only TLDs like "00" or "123" are not valid
   */
  function hasValidTLD(domain: string): boolean {
    const tld = domain.split('.').pop() || '';
    // TLD must contain at least one letter (a-z)
    // This also covers IDN TLDs which start with "xn--"
    return /[a-z]/i.test(tld);
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

    // Normalize: lowercase, dedupe, filter invalid TLDs, sort
    const normalized = [...new Set(matches.map((d) => d.toLowerCase().trim()))]
      .filter(hasValidTLD)
      .sort();

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
    const resultsSubmitBtn = document.querySelector<HTMLButtonElement>('[data-add-submit]');

    if (inputView) inputView.setAttribute('hidden', '');
    if (resultsView) {
      resultsView.removeAttribute('hidden');
      renderResultsView(lastResults);
    }

    // Update footer button
    if (resultsSubmitBtn) {
      resultsSubmitBtn.setAttribute('hidden', '');
    }

    // Show results footer buttons
    renderResultsFooter();
  }

  /**
   * Get nameservers from domain (supports both 'ns' and 'name_servers' fields)
   */
  function getNameservers(domain: BatchZoneSuccess): string[] {
    return domain.ns || domain.name_servers || [];
  }

  /**
   * Group domains by nameserver pairs
   */
  function groupByNameservers(
    domains: BatchZoneSuccess[]
  ): Record<string, { ns: string[]; domains: BatchZoneSuccess[] }> {
    const groups: Record<string, { ns: string[]; domains: BatchZoneSuccess[] }> = {};

    domains.forEach((domain) => {
      const ns = getNameservers(domain);
      const nsKey = ns.join(',');

      if (!groups[nsKey]) {
        groups[nsKey] = {
          ns: ns,
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
   * Group failed domains by error code
   */
  function groupByErrorCode(
    failed: BatchZoneFailed[]
  ): Record<string, { error: string; error_message: string; domains: string[] }> {
    const groups: Record<string, { error: string; error_message: string; domains: string[] }> = {};

    failed.forEach((item) => {
      if (!groups[item.error]) {
        groups[item.error] = {
          error: item.error,
          error_message: item.error_message,
          domains: [],
        };
      }

      groups[item.error].domains.push(item.domain);
    });

    // Sort groups by domain count (largest first)
    return Object.keys(groups)
      .sort((a, b) => groups[b].domains.length - groups[a].domains.length)
      .reduce((sorted, key) => {
        sorted[key] = groups[key];
        return sorted;
      }, {} as Record<string, { error: string; error_message: string; domains: string[] }>);
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
            <span class="cluster cluster--xs text-ok">
              <span class="icon" data-icon="mono/check-circle"></span>
              <strong>${successCount}</strong> added
            </span>
          ` : ''}
          ${failedCount > 0 ? `
            <span class="cluster cluster--xs text-danger">
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
      groupKeys.forEach((nsKey) => {
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

    // Failed list - grouped by error code
    if (failedCount > 0) {
      const errorGroups = groupByErrorCode(results.results.failed);
      const errorKeys = Object.keys(errorGroups);

      html += '<div class="stack-list">';
      html += `<h3 class="h5">${tWithVars('domains.add.results.failedTitle', { count: String(failedCount) })}</h3>`;

      errorKeys.forEach((errorKey) => {
        const group = errorGroups[errorKey];
        const hint = getErrorHint(group.error);
        const domainCount = group.domains.length;
        const isZoneLimitError = group.error === 'cf_error_1118';

        // Format domains list with truncation for large groups
        const maxDisplayDomains = 5;
        const displayDomains = group.domains.slice(0, maxDisplayDomains);
        const remainingCount = domainCount - maxDisplayDomains;
        const domainsText = displayDomains.map(d => formatDomainDisplay(d)).join(', ') +
          (remainingCount > 0 ? ` (+${remainingCount} ${t('domains.add.results.more')})` : '');

        html += `
          <div class="card card--panel">
            <header class="card__header">
              <div class="cluster cluster--sm cluster--space-between">
                <div class="cluster cluster--sm">
                  <span class="icon icon--danger" data-icon="mono/alert-circle"></span>
                  <h4 class="h5">${getErrorTitle(group.error)}</h4>
                  <span class="badge badge--danger">${domainCount} ${t('domains.add.results.failed')}</span>
                </div>
                <button
                  class="btn-icon btn-icon--ghost btn-icon--sm"
                  data-copy-domains="${group.domains.join(',')}"
                  title="${t('domains.add.results.copyDomains')}"
                >
                  <span class="icon" data-icon="mono/copy"></span>
                </button>
              </div>
            </header>
            <div class="card__body stack-sm">
              <p class="text-sm text-muted">${group.error_message}</p>

              <!-- Domains List -->
              <p class="text-sm"><strong>${t('domains.add.results.domains')}:</strong> ${domainsText}</p>

              ${hint ? `
                <div class="panel panel--warning">
                  <p class="text-sm">
                    <span class="icon" data-icon="mono/lightbulb"></span>
                    <strong>${t('domains.add.results.resolution')}:</strong> ${hint}
                  </p>
                </div>
              ` : ''}

              ${isZoneLimitError ? `
                <div class="panel panel--info stack stack--sm"${hint ? ' style="margin-top: var(--space-2);"' : ''}>
                  <p class="text-sm">
                    <span class="icon" data-icon="mono/info"></span>
                    ${t('domains.add.errors.zoneLimitExtension')}
                  </p>
                  <div class="cluster">
                    <span class="text-sm text-muted">${t('domains.add.errors.zoneLimitExtensionCta')}:</span>
                    <a href="https://chromewebstore.google.com/detail/gncbekdjakchefiiahjbjlbhhfijoikp?utm_source=301.st" target="_blank" rel="noopener noreferrer" class="btn-icon btn-icon--sm btn-icon--ghost" title="Chrome Web Store"><span class="icon" data-icon="brand/chrome"></span></a>
                    <a href="https://microsoftedge.microsoft.com/addons/detail/cloudflare-tools/kklailenhhfnlhbmfaibeonjpdkcpklc" target="_blank" rel="noopener noreferrer" class="btn-icon btn-icon--sm btn-icon--ghost" title="Microsoft Edge Add-ons"><span class="icon" data-icon="brand/edge"></span></a>
                    <a href="https://addons.mozilla.org/en-US/firefox/addon/cloudflare-tools/" target="_blank" rel="noopener noreferrer" class="btn-icon btn-icon--sm btn-icon--ghost" title="Firefox Add-ons"><span class="icon" data-icon="brand/mozilla"></span></a>
                  </div>
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
   * Parse parametric error code like "quota_exceeded:zones:need=5:available=2"
   * Returns { code: string, params: Record<string, string> }
   */
  function parseErrorCode(errorCode: string): { code: string; params: Record<string, string> } {
    const parts = errorCode.split(':');
    const code = parts[0];
    const params: Record<string, string> = {};

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes('=')) {
        const [key, value] = part.split('=');
        params[key] = value;
      } else {
        // Handle "quota_exceeded:zones" format
        params.type = part;
      }
    }

    return { code, params };
  }

  /**
   * Get user-friendly error message for global errors (non-batch)
   * Uses i18n translations from domains.add.errors.*
   */
  function getGlobalErrorMessage(errorCode: string): string {
    const { code, params } = parseErrorCode(errorCode);

    // Map API error codes to i18n keys
    const keyMap: Record<string, string> = {
      quota_exceeded: params.type === 'zones' ? 'quotaExceededZones' : 'quotaExceeded',
      missing_field: 'missingField',
      too_many_domains: 'tooManyDomains',
      key_not_found: 'keyNotFound',
      key_not_cloudflare: 'keyNotCloudflare',
      unauthorized: 'unauthorized',
      forbidden: 'forbidden',
    };

    const i18nKey = keyMap[code];
    if (i18nKey) {
      // Use tWithVars() for interpolation
      return tWithVars(`domains.add.errors.${i18nKey}`, params);
    }

    // Fallback for unknown errors
    return `Error: ${errorCode}`;
  }

  /**
   * Get user-friendly error hint for per-domain errors
   * Uses i18n translations from domains.add.errors.*
   */
  function getErrorHint(errorCode: string): string {
    const { code } = parseErrorCode(errorCode);

    // Map API error codes to i18n keys for hints
    const keyMap: Record<string, string> = {
      zone_already_in_cf: 'zoneAlreadyInCf',
      zone_in_another_account: 'zoneInAnotherAccount',
      zone_banned: 'zoneBanned',
      zone_held: 'zoneHeld',
      zone_already_pending: 'zoneAlreadyPending',
      not_registrable: 'notRegistrable',
      quota_exceeded: 'quotaExceeded',
      cf_error_1118: 'zoneLimitHint',
    };

    const i18nKey = keyMap[code];
    if (i18nKey) {
      return t(`domains.add.errors.${i18nKey}` as keyof typeof import('@i18n/locales/en').en);
    }

    return t('domains.add.errors.fallback');
  }

  /**
   * Get user-friendly error title for grouped errors
   * Uses i18n translations from domains.add.errors.titles.*
   */
  function getErrorTitle(errorCode: string): string {
    const { code } = parseErrorCode(errorCode);

    // Map API error codes to i18n keys for titles
    const keyMap: Record<string, string> = {
      zone_already_in_cf: 'zoneAlreadyInCf',
      zone_in_another_account: 'zoneInAnotherAccount',
      zone_banned: 'zoneBanned',
      zone_held: 'zoneHeld',
      zone_already_pending: 'zoneAlreadyPending',
      not_registrable: 'notRegistrable',
      quota_exceeded: 'quotaExceeded',
      cf_error_1118: 'zoneLimit',
    };

    const i18nKey = keyMap[code];
    if (i18nKey) {
      return t(`domains.add.errors.titles.${i18nKey}` as keyof typeof import('@i18n/locales/en').en);
    }

    // Return the error code itself if no translation
    return errorCode;
  }

  /**
   * Copy single nameserver to clipboard
   */
  async function copySingleNameserver(ns: string, button?: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(ns);

      // Visual feedback - turn icon green briefly
      if (button) {
        const icon = button.querySelector('.icon');
        if (icon) {
          icon.classList.add('text-ok');
          setTimeout(() => {
            icon.classList.remove('text-ok');
          }, 2000);
        }
      }
    } catch {
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

      // Visual feedback - turn icon green briefly
      if (button) {
        const icon = button.querySelector('.icon');
        if (icon) {
          icon.classList.add('text-ok');
          setTimeout(() => {
            icon.classList.remove('text-ok');
          }, 2000);
        }
      }
    } catch {
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
    hideInlineError();
  }

  /**
   * Show inline error panel (for mobile visibility)
   */
  function showInlineError(title: string, message: string): void {
    const errorPanel = document.querySelector('[data-add-error-panel]');
    const errorTitle = document.querySelector('[data-add-error-title]');
    const errorMessage = document.querySelector('[data-add-error-message]');

    if (errorPanel && errorTitle && errorMessage) {
      errorTitle.textContent = title;
      errorMessage.textContent = message;
      errorPanel.removeAttribute('hidden');
    }
  }

  /**
   * Hide inline error panel
   */
  function hideInlineError(): void {
    const errorPanel = document.querySelector('[data-add-error-panel]');
    if (errorPanel) {
      errorPanel.setAttribute('hidden', '');
    }
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
