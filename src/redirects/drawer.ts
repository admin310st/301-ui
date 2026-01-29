/**
 * Redirect drawer component
 * Handles opening, closing, and managing redirect edit/add drawer
 */

import type { DomainRedirect } from './mock-data';
import {
  updateRedirect,
  createRedirect,
  applyZoneRedirects,
} from '@api/redirects';
import {
  getState,
  updateDomainRedirect,
  addRedirectToDomain,
  markZoneSynced,
  refreshRedirects,
  getAcceptorDomain,
} from './state';
import { showGlobalNotice } from '@ui/globalNotice';

// Feature flag (should match redirects.ts)
const USE_REAL_API = true;

let drawerElement: HTMLElement | null = null;
let currentRedirect: DomainRedirect | null = null;

/**
 * Initialize drawer functionality
 */
export function initDrawer(): void {
  drawerElement = document.querySelector('[data-redirect-drawer]');
  if (!drawerElement) return;

  // Close drawer on overlay click
  const overlayElements = drawerElement.querySelectorAll('[data-drawer-close]');
  overlayElements.forEach((el) => {
    el.addEventListener('click', closeDrawer);
  });

  // Sync button in footer
  const syncButton = drawerElement.querySelector('[data-drawer-sync]');
  if (syncButton) {
    syncButton.addEventListener('click', () => {
      if (currentRedirect) {
        handleSync(currentRedirect);
      }
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerElement && !drawerElement.hasAttribute('hidden')) {
      closeDrawer();
    }
  });
}

/**
 * Open drawer for editing a redirect
 */
export function openDrawer(redirect: DomainRedirect): void {
  if (!drawerElement) return;

  currentRedirect = redirect;

  // Reset sync button to default state
  const syncBtn = drawerElement.querySelector('[data-drawer-sync]') as HTMLButtonElement;
  if (syncBtn) {
    syncBtn.removeAttribute('data-turnstile-pending');
    const textSpan = syncBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = 'Sync to Cloudflare';
  }

  // Update sync button state based on redirect status
  updateSyncButtonState(redirect);

  // Update domain name in header
  const domainEl = drawerElement.querySelector('[data-drawer-domain]');
  if (domainEl) {
    domainEl.textContent = redirect.domain;
  }

  // Update role icon based on domain role
  const roleIcon = drawerElement.querySelector('[data-redirect-icon] .icon');
  if (roleIcon) {
    if (redirect.role === 'acceptor') {
      // Primary domain (acceptor) - receives traffic
      roleIcon.setAttribute('data-icon', 'mono/arrow-right');
      roleIcon.classList.remove('text-muted');
      roleIcon.classList.add('text-primary');
      roleIcon.setAttribute('title', 'Main domain - receives traffic');
    } else {
      // Donor domain - redirects to target
      roleIcon.setAttribute('data-icon', 'mono/arrow-top-right');
      roleIcon.classList.remove('text-primary');
      roleIcon.classList.add('text-muted');
      roleIcon.setAttribute('title', 'Redirect source');
    }

    // Remove existing SVG and let the icon system re-inject
    const existingSvg = roleIcon.querySelector('svg');
    if (existingSvg) {
      existingSvg.remove();
    }

    // Trigger icon re-injection by creating a new SVG
    const symbolId = `i-${roleIcon.getAttribute('data-icon')?.replace('/', '-')}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `/icons-sprite.svg#${symbolId}`);
    svg.appendChild(use);
    roleIcon.appendChild(svg);
  }

  // Setup action buttons
  setupActionButtons(redirect);

  // Render drawer content
  renderDrawerContent(redirect);

  // Show drawer
  drawerElement.removeAttribute('hidden');
  document.body.style.overflow = 'hidden'; // Prevent background scroll
}

/**
 * Open drawer for bulk add redirects
 */
export function openBulkAddDrawer(): void {
  if (!drawerElement) return;

  currentRedirect = null;

  // Update title and subtitle
  const titleEl = drawerElement.querySelector('[data-drawer-title]');
  const subtitleEl = drawerElement.querySelector('[data-drawer-subtitle]');

  if (titleEl) {
    titleEl.textContent = 'Add Redirects';
  }

  if (subtitleEl) {
    subtitleEl.textContent = 'Bulk domain management';
  }

  // Render TODO content
  const contentEl = drawerElement.querySelector('[data-drawer-content]');
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="stack-lg" style="padding: var(--space-4) 0;">
        <div style="text-align: center;">
          <span class="icon icon--xl text-muted" data-icon="mono/plus" style="font-size: 3rem;"></span>
          <h3 class="h4" style="margin-top: var(--space-3);">Bulk Domain Management</h3>
          <p class="text-muted">Feature coming soon</p>
        </div>

        <div class="stack-sm">
          <h4 class="h5">Purpose</h4>
          <p class="text-muted" style="line-height: 1.6;">
            This interface manages <strong>reserve domains</strong> (<code>role='reserve'</code>) separately from the main table.
            When you have 100+ domains not yet attached to projects or sites, managing them in the
            main table becomes cluttered. This dedicated drawer keeps reserve domains organized
            until you're ready to structure them into your project hierarchy.
          </p>
        </div>

        <div class="stack-sm">
          <h4 class="h5">Key Features</h4>
          <ul style="line-height: 1.8; color: var(--text-muted);">
            <li>Bulk import domains from registrars or CSV</li>
            <li>View and filter reserve domains (<code>role='reserve'</code>, <code>site_id=NULL</code>)</li>
            <li>Mass assign domains to projects and sites (changes role to <code>acceptor</code>/<code>donor</code>)</li>
            <li>Configure redirects for multiple domains at once</li>
            <li>Keep main table clean by working with unstructured domains separately</li>
          </ul>
        </div>

        <div class="alert alert--info" style="margin-top: var(--space-4);">
          <p style="margin: 0;">
            <strong>Architecture:</strong> Reserve domains (<code>role='reserve'</code>) don't appear in the main Redirects table
            until they're attached to a project/site structure. This separation prevents table clutter
            and enables efficient bulk operations on raw domain portfolios.
          </p>
        </div>
      </div>
    `;
  }

  // Show drawer
  drawerElement.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Close drawer
 */
export function closeDrawer(): void {
  if (!drawerElement) return;

  drawerElement.setAttribute('hidden', '');
  document.body.style.overflow = ''; // Restore scroll
  currentRedirect = null;
}

/**
 * Setup action buttons (copy, open in new tab, sync)
 */
function setupActionButtons(redirect: DomainRedirect): void {
  if (!drawerElement) return;

  // Copy button
  const copyBtn = drawerElement.querySelector('[data-action="copy-domain-drawer"]');
  if (copyBtn) {
    const copyHandler = () => {
      navigator.clipboard.writeText(redirect.domain).then(() => {
        // Show success feedback with color change on icon
        const icon = copyBtn.querySelector('.icon');
        if (icon) {
          icon.classList.add('text-ok');
          setTimeout(() => {
            icon.classList.remove('text-ok');
          }, 2000);
        }
      }).catch(err => {
        console.error('Failed to copy domain:', err);
      });
    };
    copyBtn.removeEventListener('click', copyHandler);
    copyBtn.addEventListener('click', copyHandler);
  }

  // Open in new tab button
  const openBtn = drawerElement.querySelector('[data-action="open-domain-drawer"]');
  if (openBtn) {
    const openHandler = () => {
      window.open(`https://${redirect.domain}`, '_blank', 'noopener,noreferrer');
    };
    openBtn.removeEventListener('click', openHandler);
    openBtn.addEventListener('click', openHandler);

    // Color icon based on redirect code
    const icon = openBtn.querySelector('.icon');
    if (icon) {
      const hasRedirect = redirect.target_url && redirect.target_url.trim() !== '';
      const enabled = redirect.enabled ?? true;
      const redirectCode = redirect.redirect_code || 301;

      if (hasRedirect && enabled) {
        // Active redirect - color matches redirect code
        const redirectColor = redirectCode === 301 ? 'var(--ok)' : 'var(--warning)';
        (icon as HTMLElement).style.color = redirectColor;
        openBtn.setAttribute('title', 'Test redirect');
      } else if (hasRedirect && !enabled) {
        // Disabled redirect - use muted color
        (icon as HTMLElement).style.color = 'var(--text-muted)';
        openBtn.setAttribute('title', 'Open domain (redirect disabled)');
      } else {
        // No redirect configured - use muted color
        (icon as HTMLElement).style.color = 'var(--text-muted)';
        openBtn.setAttribute('title', 'Open domain');
      }
    }
  }

}

/**
 * Setup dropdown handlers for redirect code selection
 */
function setupDropdownHandlers(): void {
  if (!drawerElement) return;

  const dropdown = drawerElement.querySelector('[data-dropdown="redirect-code"]');
  if (!dropdown) return;

  const trigger = dropdown.querySelector('.dropdown__trigger');
  const menu = dropdown.querySelector('.dropdown__menu');
  const items = dropdown.querySelectorAll('.dropdown__item');
  const label = dropdown.querySelector('[data-selected-label]');

  if (!trigger || !menu) return;

  // Toggle dropdown
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('dropdown--open');
    dropdown.classList.toggle('dropdown--open', !isOpen);
    trigger.setAttribute('aria-expanded', (!isOpen).toString());
  });

  // Handle item selection with auto-save
  items.forEach((item) => {
    item.addEventListener('click', async () => {
      const value = item.getAttribute('data-value');
      const text = item.textContent?.trim();

      // Update selected state
      items.forEach((i) => i.classList.remove('is-active'));
      item.classList.add('is-active');

      // Update label
      if (label && text) {
        label.textContent = text;
      }

      // Store value
      if (trigger) {
        trigger.setAttribute('data-selected-value', value || '301');

        // Update border color based on selected code
        const borderColor = value === '301' ? 'var(--ok)' : 'var(--warning)';
        (trigger as HTMLElement).style.borderColor = borderColor;
      }

      // Close dropdown
      dropdown.classList.remove('dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');

      // Auto-save if redirect exists
      if (currentRedirect?.has_redirect && currentRedirect.id && USE_REAL_API) {
        await autoSaveField('status_code', parseInt(value || '301') as 301 | 302);
      }
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target as Node)) {
      dropdown.classList.remove('dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Setup toggle handlers for enable/disable button with auto-save
 */
function setupToggleHandlers(): void {
  if (!drawerElement) return;

  const toggleBtn = drawerElement.querySelector('[data-drawer-toggle="enabled"]');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', async () => {
    const currentEnabled = toggleBtn.getAttribute('data-enabled') === 'true';
    const newEnabled = !currentEnabled;

    // Update border color based on state
    (toggleBtn as HTMLElement).style.borderColor = newEnabled ? 'var(--ok)' : 'var(--danger)';

    // Update icon - remove old SVG and update data-icon
    const iconContainer = toggleBtn.querySelector('.icon');
    if (iconContainer) {
      const newIconName = `mono/${newEnabled ? 'check-circle' : 'close-circle'}`;
      iconContainer.setAttribute('data-icon', newIconName);

      // Update icon color to match state
      (iconContainer as HTMLElement).style.color = newEnabled ? 'var(--ok)' : 'var(--danger)';

      // Remove existing SVG
      const existingSvg = iconContainer.querySelector('svg');
      if (existingSvg) {
        existingSvg.remove();
      }

      // Create new SVG with correct icon
      const symbolId = `i-${newIconName.replace('/', '-')}`;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `/icons-sprite.svg#${symbolId}`);
      svg.appendChild(use);
      iconContainer.appendChild(svg);
    }

    // Update text
    const textSpan = toggleBtn.querySelector('span:last-child');
    if (textSpan) {
      textSpan.textContent = newEnabled ? 'Enabled' : 'Disabled';
    }

    // Store value
    toggleBtn.setAttribute('data-enabled', newEnabled.toString());

    // Update sync button state
    updateSyncButtonState(currentRedirect || undefined);

    // Auto-save if redirect exists
    if (currentRedirect?.has_redirect && currentRedirect.id && USE_REAL_API) {
      await autoSaveField('enabled', newEnabled);
    }
  });
}

/**
 * Setup target URL input handlers (blur and Enter key)
 */
function setupTargetUrlHandlers(): void {
  if (!drawerElement) return;

  const targetInput = drawerElement.querySelector('[data-drawer-field="target_url"]') as HTMLInputElement;
  if (!targetInput) return;

  let originalValue = targetInput.value;

  // Update sync button on input change
  targetInput.addEventListener('input', () => {
    updateSyncButtonState(currentRedirect || undefined);
  });

  // Save on blur if value changed
  targetInput.addEventListener('blur', async () => {
    const newValue = targetInput.value.trim();
    if (newValue !== originalValue && newValue !== '') {
      originalValue = newValue;
      await handleTargetUrlSave(newValue);
    }
  });

  // Save on Enter key
  targetInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      targetInput.blur();
    }
  });
}

/**
 * Handle target URL save (create or update redirect)
 */
async function handleTargetUrlSave(targetUrl: string): Promise<void> {
  if (!currentRedirect || !USE_REAL_API) return;

  // Get current dropdown values
  const redirectCodeTrigger = drawerElement?.querySelector('[data-drawer-dropdown="redirect_code"]');
  const redirectCode = parseInt(redirectCodeTrigger?.getAttribute('data-selected-value') || '301') as 301 | 302;

  const toggleBtn = drawerElement?.querySelector('[data-drawer-toggle="enabled"]');
  const enabled = toggleBtn?.getAttribute('data-enabled') === 'true';

  try {
    if (currentRedirect.has_redirect && currentRedirect.id) {
      // Update existing redirect
      await updateRedirect(currentRedirect.id, {
        params: { target_url: targetUrl },
        status_code: redirectCode,
        enabled,
      });

      // Optimistic state update
      updateDomainRedirect(currentRedirect.domain_id, {
        params: { target_url: targetUrl },
        status_code: redirectCode,
        enabled,
        sync_status: 'pending',
      });

      showGlobalNotice('success', 'Redirect updated');
    } else {
      // Create new redirect (T1 template = simple redirect)
      const response = await createRedirect(currentRedirect.domain_id, {
        template_id: 'T1',
        params: { target_url: targetUrl },
        status_code: redirectCode,
      });

      // Update current redirect with new data
      currentRedirect.id = response.redirect.id;
      currentRedirect.has_redirect = true;

      // Add redirect to state
      const redirectWithPendingStatus = {
        ...response.redirect,
        sync_status: 'pending' as const,
      };
      addRedirectToDomain(currentRedirect.domain_id, redirectWithPendingStatus, 'donor');

      showGlobalNotice('success', 'Redirect created');

      // Update sync button state
      updateSyncButtonState(currentRedirect);
    }
  } catch (error: any) {
    showGlobalNotice('error', error.message || 'Failed to save redirect');
  }
}

/**
 * Auto-save a single field (enabled or status_code)
 */
async function autoSaveField(field: 'enabled' | 'status_code', value: boolean | 301 | 302): Promise<void> {
  if (!currentRedirect?.has_redirect || !currentRedirect.id) return;

  try {
    const updateData: { enabled?: boolean; status_code?: 301 | 302 } = {};
    if (field === 'enabled') {
      updateData.enabled = value as boolean;
    } else {
      updateData.status_code = value as 301 | 302;
    }

    await updateRedirect(currentRedirect.id, updateData);

    // Optimistic state update
    updateDomainRedirect(currentRedirect.domain_id, {
      ...updateData,
      sync_status: 'pending',
    });

    showGlobalNotice('success', field === 'enabled' ? 'Status updated' : 'Redirect code updated');
  } catch (error: any) {
    showGlobalNotice('error', error.message || 'Failed to save');
  }
}

/**
 * Update sync button state in footer based on current form state
 * Checks both saved redirect AND current input values
 */
function updateSyncButtonState(redirect?: DomainRedirect): void {
  if (!drawerElement) return;

  const syncBtn = drawerElement.querySelector('[data-drawer-sync]') as HTMLButtonElement;
  if (!syncBtn) return;

  // Check current input value (may be different from saved state)
  const targetInput = drawerElement.querySelector('[data-drawer-field="target_url"]') as HTMLInputElement;
  const currentTargetUrl = targetInput?.value?.trim() || '';

  // Check current toggle state
  const toggleBtn = drawerElement.querySelector('[data-drawer-toggle="enabled"]');
  const currentEnabled = toggleBtn?.getAttribute('data-enabled') !== 'false';

  // Enable sync if there's a target URL and redirect is enabled
  if (!currentTargetUrl) {
    syncBtn.disabled = true;
    syncBtn.title = 'Enter target URL first';
  } else if (!currentEnabled) {
    syncBtn.disabled = true;
    syncBtn.title = 'Enable redirect to sync';
  } else {
    syncBtn.disabled = false;
    syncBtn.title = redirect?.has_redirect ? '' : 'Create and sync redirect';
  }
}

/**
 * Render drawer content with cards and detail-list
 */
function renderDrawerContent(redirect: DomainRedirect): void {
  const contentEl = drawerElement?.querySelector('[data-drawer-content]');
  if (!contentEl) return;

  const isAcceptor = redirect.role === 'acceptor';

  // Get acceptor domain for this site (for pre-filling target URL)
  const acceptorDomain = getAcceptorDomain(redirect.site_id);
  const defaultTargetUrl = acceptorDomain
    ? `https://${acceptorDomain.domain_name}`
    : '';

  const content = `
    <div class="stack-list">
      <!-- Overview -->
      <section class="card card--panel">
        <header class="card__header">
          <h3 class="h5">Overview</h3>
        </header>
        <div class="card__body">
          <dl class="detail-list">
            <div class="detail-row">
              <dt class="detail-label">Project</dt>
              <dd class="detail-value">${redirect.project_name || '—'}</dd>
            </div>
            <div class="detail-row">
              <dt class="detail-label">Site</dt>
              <dd class="detail-value">${redirect.site_name || '—'}</dd>
            </div>
            ${isAcceptor ? `
              <div class="detail-row">
                <dt class="detail-label">Role</dt>
                <dd class="detail-value">
                  <span class="badge badge--sm badge--success">Main domain</span>
                  <span class="text-muted text-sm">— receives traffic from other domains</span>
                </dd>
              </div>
            ` : redirect.target_url ? `
              <div class="detail-row">
                <dt class="detail-label">Target</dt>
                <dd class="detail-value">
                  <span class="detail-value--mono">${redirect.target_url}</span>
                </dd>
              </div>
            ` : acceptorDomain ? `
              <div class="detail-row">
                <dt class="detail-label">Target</dt>
                <dd class="detail-value text-muted">
                  Will redirect to <strong>${acceptorDomain.domain_name}</strong>
                </dd>
              </div>
            ` : `
              <div class="detail-row">
                <dt class="detail-label">Target</dt>
                <dd class="detail-value text-muted">No redirect configured</dd>
              </div>
            `}
          </dl>
        </div>
      </section>

      ${isAcceptor ? '' : renderRedirectConfigCard(redirect, defaultTargetUrl)}
      ${renderSyncStatusCard(redirect)}
    </div>
  `;

  contentEl.innerHTML = content;

  // Setup dropdown, toggle, and input handlers after content is rendered
  setupDropdownHandlers();
  setupToggleHandlers();
  setupTargetUrlHandlers();
}

/**
 * Render redirect configuration card (for redirect domains)
 * @param redirect - Domain redirect data
 * @param defaultTargetUrl - Pre-filled target URL (usually acceptor domain)
 */
function renderRedirectConfigCard(redirect: DomainRedirect, defaultTargetUrl: string = ''): string {
  const redirectCode = redirect.redirect_code || 301;
  const enabled = redirect.enabled ?? true;
  const hasRedirect = redirect.target_url && redirect.target_url.trim() !== '';

  // Use existing target URL or default (acceptor domain)
  const targetValue = redirect.target_url || defaultTargetUrl;
  const isNewRedirect = !hasRedirect && defaultTargetUrl;

  const redirectCodeLabel = redirectCode === 301 ? '301 - Permanent' : '302 - Temporary';
  const redirectCodeColor = redirectCode === 301 ? 'var(--ok)' : 'var(--warning)';

  return `
    <section class="card card--panel">
      <header class="card__header">
        <h3 class="h5">${isNewRedirect ? 'Create Redirect' : 'Redirect Configuration'}</h3>
      </header>
      <div class="card__body">
        <div class="stack-list">
          <div class="field">
            <label class="field__label" for="drawer-target">
              Target
              <span class="field__hint">${isNewRedirect ? 'Pre-filled with main domain' : 'Destination URL or host'}</span>
            </label>
            <input
              type="text"
              id="drawer-target"
              class="input"
              placeholder="https://example.com"
              value="${targetValue}"
              data-drawer-field="target_url"
            />
          </div>

          <div class="detail-row" style="align-items: center;">
            <dt class="detail-label">Redirect Code</dt>
            <dd class="detail-value">
              <div class="dropdown" data-dropdown="redirect-code">
                <button
                  class="btn-chip btn-chip--sm btn-chip--dropdown dropdown__trigger"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded="false"
                  data-drawer-dropdown="redirect_code"
                  data-selected-value="${redirectCode}"
                  style="border-color: ${redirectCodeColor};"
                >
                  <span class="btn-chip__label" data-selected-label>${redirectCodeLabel}</span>
                  <span class="btn-chip__chevron" data-icon="mono/chevron-down"></span>
                </button>
                <div class="dropdown__menu dropdown__menu--fit-trigger" role="menu">
                  <button
                    class="dropdown__item ${redirectCode === 301 ? 'is-active' : ''}"
                    type="button"
                    role="menuitem"
                    data-value="301"
                  >
                    301 - Permanent
                  </button>
                  <button
                    class="dropdown__item ${redirectCode === 302 ? 'is-active' : ''}"
                    type="button"
                    role="menuitem"
                    data-value="302"
                  >
                    302 - Temporary
                  </button>
                </div>
              </div>
            </dd>
          </div>

          <div class="detail-row" style="align-items: center;">
            <dt class="detail-label">Status</dt>
            <dd class="detail-value">
              <button
                class="btn btn--sm btn--outline"
                type="button"
                data-drawer-toggle="enabled"
                data-enabled="${enabled}"
                style="border-color: ${enabled ? 'var(--ok)' : 'var(--danger)'};"
              >
                <span class="icon" data-icon="mono/${enabled ? 'check-circle' : 'close-circle'}" style="color: ${enabled ? 'var(--ok)' : 'var(--danger)'}"></span>
                <span>${enabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </dd>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render sync status card
 */
function renderSyncStatusCard(redirect: DomainRedirect): string {
  const lastSync = redirect.last_sync_at
    ? new Date(redirect.last_sync_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Never';

  const syncError = redirect.sync_error;
  const syncStatusText = syncError ? 'Failed' : (redirect.last_sync_at ? 'Synced' : 'Not synced');
  const syncStatusColor = syncError ? 'text-danger' : (redirect.last_sync_at ? 'text-success' : 'text-muted');

  return `
    <section class="card card--panel">
      <header class="card__header">
        <h3 class="h5">Sync Status</h3>
      </header>
      <div class="card__body">
        <dl class="detail-list">
          <div class="detail-row">
            <dt class="detail-label">Status</dt>
            <dd class="detail-value">
              <span class="${syncStatusColor}">${syncStatusText}</span>
            </dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Last Sync</dt>
            <dd class="detail-value">${lastSync}</dd>
          </div>
          ${syncError ? `
            <div class="detail-row">
              <dt class="detail-label">Error</dt>
              <dd class="detail-value">
                <span class="text-danger text-sm">${syncError}</span>
              </dd>
            </div>
          ` : ''}
        </dl>
      </div>
    </section>
  `;
}

/**
 * Handle sync button click (footer button)
 * Creates redirect if doesn't exist, then syncs to Cloudflare
 */
async function handleSync(redirect: DomainRedirect): Promise<void> {
  if (!drawerElement) return;

  // Get current form values
  const targetInput = drawerElement.querySelector('[data-drawer-field="target_url"]') as HTMLInputElement;
  const targetUrl = targetInput?.value?.trim() || '';

  const redirectCodeTrigger = drawerElement.querySelector('[data-drawer-dropdown="redirect_code"]');
  const redirectCode = parseInt(redirectCodeTrigger?.getAttribute('data-selected-value') || '301') as 301 | 302;

  if (!targetUrl) {
    showGlobalNotice('error', 'Enter target URL first');
    return;
  }

  console.log('Syncing redirect:', {
    id: redirect.id,
    domain: redirect.domain,
    has_redirect: redirect.has_redirect,
    target_url: targetUrl
  });

  if (!USE_REAL_API) {
    return;
  }

  // Get zone_id from state
  const state = getState();
  const domain = state.domains.find(d => d.domain_id === redirect.domain_id);
  if (!domain?.zone_id) {
    showGlobalNotice('error', 'Domain is not associated with a Cloudflare zone');
    return;
  }

  // Update sync button to show progress with shimmer
  const syncBtn = drawerElement.querySelector('[data-drawer-sync]') as HTMLButtonElement;
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.setAttribute('data-turnstile-pending', '');
    const textSpan = syncBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = redirect.has_redirect ? 'Syncing...' : 'Creating...';
  }

  try {
    // Step 1: Create redirect if doesn't exist
    if (!redirect.has_redirect) {
      console.log('[handleSync] Creating redirect for domain:', redirect.domain_id);
      const response = await createRedirect(redirect.domain_id, {
        template_id: 'T1',
        params: { target_url: targetUrl },
        status_code: redirectCode,
      });
      console.log('[handleSync] Redirect created:', response);

      // Update current redirect with new data
      redirect.id = response.redirect.id;
      redirect.has_redirect = true;
      if (currentRedirect) {
        currentRedirect.id = response.redirect.id;
        currentRedirect.has_redirect = true;
      }

      // Add redirect to state
      addRedirectToDomain(redirect.domain_id, {
        ...response.redirect,
        sync_status: 'pending' as const,
      }, 'donor');

      // Update button text
      if (syncBtn) {
        const textSpan = syncBtn.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = 'Syncing...';
      }
    } else {
      // Mark as pending in state
      updateDomainRedirect(redirect.domain_id, { sync_status: 'pending' });
    }

    // Step 2: Sync to Cloudflare
    console.log('[handleSync] Applying redirects to zone:', domain.zone_id);
    const response = await applyZoneRedirects(domain.zone_id);
    console.log('[handleSync] Zone sync response:', response);

    // Update state with synced redirects
    const syncedIds = response.synced_rules?.map(r => r.id) || [];
    markZoneSynced(domain.zone_id, syncedIds);

    showGlobalNotice('success', `Synced ${response.rules_applied || 1} redirect(s) to Cloudflare`);

    // Remove shimmer
    if (syncBtn) {
      syncBtn.removeAttribute('data-turnstile-pending');
    }

    // Refresh state to get latest data
    await refreshRedirects();

    // Close drawer after successful sync
    closeDrawer();
  } catch (error: any) {
    console.error('[handleSync] Error:', error);

    // Mark as error if redirect exists
    if (redirect.has_redirect) {
      updateDomainRedirect(redirect.domain_id, { sync_status: 'error' });
    }

    showGlobalNotice('error', error.message || 'Failed to sync to Cloudflare');

    // Re-enable sync button and remove shimmer
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.removeAttribute('data-turnstile-pending');
      const textSpan = syncBtn.querySelector('span:last-child');
      if (textSpan) textSpan.textContent = 'Retry';
    }
  }
}
