/**
 * Redirect drawer component
 * Handles opening, closing, and managing redirect edit/add drawer
 */

import type { DomainRedirect } from './mock-data';

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

  // Save button
  const saveButton = drawerElement.querySelector('[data-drawer-save]');
  if (saveButton) {
    saveButton.addEventListener('click', handleSave);
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
      navigator.clipboard.writeText(redirect.domain);
      // TODO: Show toast notification
      console.log('Copied:', redirect.domain);
    };
    copyBtn.removeEventListener('click', copyHandler);
    copyBtn.addEventListener('click', copyHandler);
  }

  // Open in new tab button
  const openBtn = drawerElement.querySelector('[data-action="open-domain-drawer"]');
  if (openBtn) {
    const openHandler = () => {
      window.open(`https://${redirect.domain}`, '_blank');
    };
    openBtn.removeEventListener('click', openHandler);
    openBtn.addEventListener('click', openHandler);
  }

  // Sync button
  const syncBtn = drawerElement.querySelector('[data-action="sync-redirect"]');
  if (syncBtn) {
    const syncHandler = () => {
      handleSync(redirect);
    };
    syncBtn.removeEventListener('click', syncHandler);
    syncBtn.addEventListener('click', syncHandler);
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

  // Handle item selection
  items.forEach((item) => {
    item.addEventListener('click', () => {
      const value = item.getAttribute('data-value');
      const text = item.textContent?.trim();

      // Update selected state
      items.forEach((i) => i.classList.remove('is-active'));
      item.classList.add('is-active');

      // Update label
      if (label && text) {
        label.textContent = text;
      }

      // Store value for save
      if (trigger) {
        trigger.setAttribute('data-selected-value', value || '301');

        // Update border color based on selected code
        const borderColor = value === '301' ? 'var(--ok)' : 'var(--warning)';
        (trigger as HTMLElement).style.borderColor = borderColor;
      }

      // Close dropdown
      dropdown.classList.remove('dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');
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
 * Setup toggle handlers for enable/disable button
 */
function setupToggleHandlers(): void {
  if (!drawerElement) return;

  const toggleBtn = drawerElement.querySelector('[data-drawer-toggle="enabled"]');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const currentEnabled = toggleBtn.getAttribute('data-enabled') === 'true';
    const newEnabled = !currentEnabled;

    // Update button state classes
    if (newEnabled) {
      toggleBtn.classList.remove('btn--ghost');
      toggleBtn.classList.add('btn--success');
    } else {
      toggleBtn.classList.remove('btn--success');
      toggleBtn.classList.add('btn--ghost');
    }

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

    // Store value for save
    toggleBtn.setAttribute('data-enabled', newEnabled.toString());
  });
}

/**
 * Render drawer content with cards and detail-list
 */
function renderDrawerContent(redirect: DomainRedirect): void {
  const contentEl = drawerElement?.querySelector('[data-drawer-content]');
  if (!contentEl) return;

  const isAcceptor = redirect.role === 'acceptor';

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
            ${!isAcceptor && redirect.target_url ? `
              <div class="detail-row">
                <dt class="detail-label">Target</dt>
                <dd class="detail-value">
                  <div class="stack-list stack-list--xs">
                    <span class="detail-value--mono">${redirect.target_url}</span>
                    <a href="https://${redirect.domain}" target="_blank" rel="noopener noreferrer" class="link-button" style="font-size: var(--fs-sm);">
                      <span class="icon" data-icon="mono/open-in-new"></span>
                      <span>Test redirect</span>
                    </a>
                  </div>
                </dd>
              </div>
            ` : !isAcceptor ? `
              <div class="detail-row">
                <dt class="detail-label">Target</dt>
                <dd class="detail-value text-muted">No redirect configured</dd>
              </div>
            ` : ''}
          </dl>
        </div>
      </section>

      ${isAcceptor ? '' : renderRedirectConfigCard(redirect)}
      ${renderSyncStatusCard(redirect)}
    </div>
  `;

  contentEl.innerHTML = content;

  // Setup dropdown and toggle handlers after content is rendered
  setupDropdownHandlers();
  setupToggleHandlers();
}

/**
 * Render redirect configuration card (for redirect domains)
 */
function renderRedirectConfigCard(redirect: DomainRedirect): string {
  const redirectCode = redirect.redirect_code || 301;
  const enabled = redirect.enabled ?? true;
  const hasRedirect = redirect.target_url && redirect.target_url.trim() !== '';

  const redirectCodeLabel = redirectCode === 301 ? '301 - Permanent' : '302 - Temporary';
  const redirectCodeColor = redirectCode === 301 ? 'var(--ok)' : 'var(--warning)';

  return `
    <section class="card card--panel">
      <header class="card__header">
        <h3 class="h5">Redirect Configuration</h3>
      </header>
      <div class="card__body">
        <div class="stack-list">
          <div class="field">
            <label class="field__label" for="drawer-target">
              Target
              <span class="field__hint">Destination URL or host</span>
            </label>
            <input
              type="text"
              id="drawer-target"
              class="input"
              placeholder="https://example.com"
              value="${redirect.target_url || ''}"
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
                <div class="dropdown__menu" role="menu">
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
                class="btn btn--sm ${enabled ? 'btn--success' : 'btn--ghost'}"
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
  const lastSync = redirect.last_sync
    ? new Date(redirect.last_sync).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Never';

  const hasRedirect = redirect.target_url && redirect.target_url.trim() !== '';
  const enabled = redirect.enabled ?? true;
  const syncError = redirect.sync_error;
  const syncPending = false; // TODO: Add sync_pending field to DomainRedirect type

  // Determine sync button state
  let syncButtonLabel = 'Sync now';
  let syncButtonDisabled = false;
  let syncButtonTooltip = '';

  if (syncPending) {
    syncButtonLabel = 'Syncing...';
    syncButtonDisabled = true;
  } else if (syncError) {
    syncButtonLabel = 'Retry sync';
  } else if (!hasRedirect) {
    syncButtonDisabled = true;
    syncButtonTooltip = 'Configure redirect first';
  } else if (!enabled) {
    syncButtonDisabled = true;
    syncButtonTooltip = 'Enable redirect to sync';
  }

  const syncStatusText = syncError ? 'Failed' : (redirect.last_sync ? 'Synced' : 'Not synced');
  const syncStatusColor = syncError ? 'text-danger' : (redirect.last_sync ? 'text-success' : 'text-muted');

  return `
    <section class="card card--panel">
      <header class="card__header">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <h3 class="h5">Sync Status</h3>
          <button
            class="btn btn--sm btn--cf"
            type="button"
            data-action="sync-redirect"
            ${syncButtonDisabled ? 'disabled' : ''}
            ${syncButtonTooltip ? `title="${syncButtonTooltip}"` : ''}
          >
            ${syncPending ? '<span class="spinner spinner--sm"></span>' : '<span class="icon" data-icon="brand/cloudflare"></span>'}
            <span>${syncButtonLabel}</span>
          </button>
        </div>
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
 * Handle save button click
 */
function handleSave(): void {
  if (!currentRedirect || !drawerElement) return;

  // Collect form data
  const targetUrl = (drawerElement.querySelector('[data-drawer-field="target_url"]') as HTMLInputElement)?.value || '';

  // Get redirect code from dropdown
  const redirectCodeTrigger = drawerElement.querySelector('[data-drawer-dropdown="redirect_code"]');
  const redirectCode = parseInt(redirectCodeTrigger?.getAttribute('data-selected-value') || '301');

  // Get enabled state from toggle button
  const toggleBtn = drawerElement.querySelector('[data-drawer-toggle="enabled"]');
  const enabled = toggleBtn?.getAttribute('data-enabled') === 'true' || toggleBtn?.classList.contains('btn--success');

  // TODO: Validate and send to API
  console.log('Saving redirect:', {
    id: currentRedirect.id,
    domain: currentRedirect.domain,
    target_url: targetUrl,
    redirect_code: redirectCode,
    enabled
  });

  // TODO: Update redirect in state and re-render table
  // For now, just close drawer
  closeDrawer();
}

/**
 * Handle sync button click
 */
function handleSync(redirect: DomainRedirect): void {
  if (!drawerElement) return;

  // TODO: Check for unsaved changes and show warning if needed
  // TODO: Send sync request to API
  console.log('Syncing redirect:', {
    id: redirect.id,
    domain: redirect.domain,
    target_url: redirect.target_url
  });

  // TODO: Update UI to show sync in progress
  // TODO: After sync completes, update sync status and re-render
}
