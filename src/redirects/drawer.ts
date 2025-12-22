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

  // Update title and subtitle
  const titleEl = drawerElement.querySelector('[data-drawer-title]');
  const subtitleEl = drawerElement.querySelector('[data-drawer-subtitle]');

  if (titleEl) {
    titleEl.textContent = redirect.target_url ? 'Edit Redirect' : 'Add Redirect';
  }

  if (subtitleEl) {
    subtitleEl.textContent = redirect.domain;
  }

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
            This interface will handle <strong>unassigned domains</strong> separately from the main table.
            When you have 100+ domains not yet attached to projects or sites, managing them in the
            main table becomes cluttered. This dedicated view keeps unassigned domains organized
            until you're ready to structure them.
          </p>
        </div>

        <div class="stack-sm">
          <h4 class="h5">Key Features</h4>
          <ul style="line-height: 1.8; color: var(--text-muted);">
            <li>Bulk import domains from registrars or CSV</li>
            <li>View and filter unassigned domains (not yet linked to projects/sites)</li>
            <li>Mass assign domains to projects and sites</li>
            <li>Configure redirects for multiple domains at once</li>
            <li>Keep main table clean by working with unstructured domains separately</li>
          </ul>
        </div>

        <div class="alert alert--info" style="margin-top: var(--space-4);">
          <p style="margin: 0;">
            <strong>Architecture Note:</strong> Unassigned domains won't appear in the main Redirects table
            until they're attached to a project/site structure. This separation prevents table clutter
            and enables efficient bulk operations on raw domain lists.
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
 * Render drawer content
 */
function renderDrawerContent(redirect: DomainRedirect): string {
  const contentEl = drawerElement?.querySelector('[data-drawer-content]');
  if (!contentEl) return '';

  const isPrimaryDomain = redirect.target_url === undefined || redirect.target_url === '';

  const content = `
    <div class="stack-md">
      <!-- Domain Info -->
      <div class="form-group">
        <label class="form-label">Domain</label>
        <div class="form-value text-muted">${redirect.domain}</div>
      </div>

      ${isPrimaryDomain ? renderPrimaryDomainFields(redirect) : renderRedirectFields(redirect)}

      <!-- Status Info -->
      <div class="stack-sm">
        <h3 class="h5">Sync Status</h3>
        <div class="form-group">
          <label class="form-label">Last Sync</label>
          <div class="form-value text-muted">
            ${redirect.last_sync ? new Date(redirect.last_sync).toLocaleString() : 'Never synced'}
          </div>
        </div>
        ${redirect.sync_error ? `
          <div class="alert alert--danger">
            <strong>Sync Error:</strong> ${redirect.sync_error}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  contentEl.innerHTML = content;
  return content;
}

/**
 * Render fields for primary domains (sites)
 */
function renderPrimaryDomainFields(redirect: DomainRedirect): string {
  return `
    <div class="form-group">
      <label class="form-label">Site Type</label>
      <div class="form-value">
        <span class="badge badge--sm badge--neutral">${redirect.site_type}</span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Site Flag</label>
      <div class="form-value text-muted">${redirect.site_flag}</div>
    </div>
  `;
}

/**
 * Render fields for redirect configuration
 */
function renderRedirectFields(redirect: DomainRedirect): string {
  const targetUrl = redirect.target_url || '';
  const redirectCode = redirect.redirect_code || 301;
  const enabled = redirect.enabled ?? true;

  return `
    <div class="form-group">
      <label class="form-label" for="drawer-target-url">
        Target URL
        <span class="text-muted">·</span>
        <span class="text-sm text-muted">Where this domain redirects to</span>
      </label>
      <input
        type="url"
        id="drawer-target-url"
        class="input"
        placeholder="https://example.com"
        value="${targetUrl}"
        data-drawer-field="target_url"
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="drawer-redirect-code">Redirect Code</label>
      <select
        id="drawer-redirect-code"
        class="input"
        data-drawer-field="redirect_code"
      >
        <option value="301" ${redirectCode === 301 ? 'selected' : ''}>301 - Permanent</option>
        <option value="302" ${redirectCode === 302 ? 'selected' : ''}>302 - Temporary</option>
      </select>
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          class="checkbox"
          ${enabled ? 'checked' : ''}
          data-drawer-field="enabled"
        />
        <span>Enable redirect</span>
      </label>
    </div>
  `;
}

/**
 * Handle save button click
 */
function handleSave(): void {
  if (!currentRedirect || !drawerElement) return;

  // Collect form data
  const targetUrl = (drawerElement.querySelector('[data-drawer-field="target_url"]') as HTMLInputElement)?.value || '';
  const redirectCode = parseInt((drawerElement.querySelector('[data-drawer-field="redirect_code"]') as HTMLSelectElement)?.value || '301');
  const enabled = (drawerElement.querySelector('[data-drawer-field="enabled"]') as HTMLInputElement)?.checked ?? true;

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
