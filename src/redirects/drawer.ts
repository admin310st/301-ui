/**
 * Redirect drawer component
 * Handles opening, closing, and managing redirect edit/add drawer
 */

import type { ExtendedRedirectDomain } from './state';
import type { Site } from '@api/types';
import { getTargetUrl } from './helpers';
import {
  updateRedirect,
  createRedirect,
  deleteRedirect,
  applyZoneRedirects,
} from '@api/redirects';
import { getSite, updateSite } from '@api/sites';
import { safeCall } from '@api/ui-client';
import { showConfirmDialog } from '@ui/dialog';
import {
  getState,
  updateDomainRedirect,
  addRedirectToDomain,
  removeRedirectFromDomain,
  addCanonicalToDomain,
  removeCanonicalFromDomain,
  markZoneSynced,
  refreshRedirects,
  getAcceptorDomain,
  updateSiteContext,
} from './state';
import { showGlobalNotice } from '@ui/globalNotice';
import { openManageSiteDomainsDrawer } from '@domains/site-domains';
import { drawerManager } from '@ui/drawer-manager';

/** Donor template definitions — drives the template dropdown and dynamic fields */
const DONOR_TEMPLATES = [
  { id: 'T1', label: 'Domain redirect', hint: 'Entire domain to another URL',
    defaultCode: 301 as const, fields: [
      { name: 'target_url', label: 'Target', placeholder: 'https://example.com' },
    ] },
  { id: 'T5', label: 'Path redirect', hint: 'Path prefix to another path',
    defaultCode: 301 as const, fields: [
      { name: 'source_path', label: 'Source path', placeholder: '/old/' },
      { name: 'target_path', label: 'Target path', placeholder: '/new/' },
    ] },
  { id: 'T6', label: 'Exact path \u2192 URL', hint: 'Specific page to another URL',
    defaultCode: 301 as const, fields: [
      { name: 'source_path', label: 'Source path', placeholder: '/old-page' },
      { name: 'target_url', label: 'Target URL', placeholder: 'https://example.com/new' },
    ] },
  { id: 'T7', label: 'Maintenance mode', hint: 'Temporary redirect (302)',
    defaultCode: 302 as const, fields: [
      { name: 'target_url', label: 'Maintenance URL', placeholder: 'https://example.com/maintenance' },
    ] },
] as const;

let drawerElement: HTMLElement | null = null;
let currentDomain: ExtendedRedirectDomain | null = null;
let currentSite: Site | null = null; // Fetched site data for acceptor form

/**
 * Initialize drawer functionality
 */
export function initDrawer(): void {
  drawerElement = document.querySelector('[data-drawer="redirect-inspector"]');
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
      if (currentDomain) {
        handleSync(currentDomain);
      }
    });
  }

  // Save button in footer (persists changes to API)
  const saveButton = drawerElement.querySelector('[data-drawer-save]');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      if (currentDomain) {
        handleSave(currentDomain);
      }
    });
  }

  // Delete button in footer (shown when redirect is disabled)
  const deleteButton = drawerElement.querySelector('[data-drawer-delete]');
  if (deleteButton) {
    deleteButton.addEventListener('click', () => {
      if (currentDomain) {
        handleDelete(currentDomain);
      }
    });
  }

  // Manage domains button in acceptor footer
  const manageDomainsBtn = drawerElement.querySelector('[data-action="manage-domains-drawer"]');
  if (manageDomainsBtn) {
    manageDomainsBtn.addEventListener('click', () => {
      if (currentDomain?.site_id) {
        openManageSiteDomainsDrawer(currentDomain.site_id);
      }
    });
  }

  // Save site button in acceptor footer
  const saveSiteBtn = drawerElement.querySelector('[data-drawer-save-site]');
  if (saveSiteBtn) {
    saveSiteBtn.addEventListener('click', handleSaveSite);
  }

  // Note: Escape key is handled centrally by drawerManager
}

/**
 * Open drawer for editing a redirect
 */
export async function openDrawer(domain: ExtendedRedirectDomain): Promise<void> {
  if (!drawerElement) return;

  currentDomain = domain;
  currentSite = null;

  const isAcceptor = domain.domain_role === 'acceptor';

  // For acceptor domains, fetch full site data from API
  if (isAcceptor && domain.site_id) {
    try {
      const response = await safeCall(
        () => getSite(domain.site_id),
        { retryOn401: true }
      );
      currentSite = response.site;
    } catch (error: any) {
      // Continue without site data - form will show redirect data as fallback
      console.warn('[Drawer] Failed to fetch site data:', error);
    }
  }

  // Reset sync button to default state
  const syncBtn = drawerElement.querySelector('[data-drawer-sync]') as HTMLButtonElement;
  if (syncBtn) {
    syncBtn.removeAttribute('data-turnstile-pending');
    const textSpan = syncBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = 'Sync to Cloudflare';
  }

  // Update sync button state based on redirect status
  updateSyncButtonState(domain);

  // Update domain name in header
  const domainEl = drawerElement.querySelector('[data-drawer-domain]');
  if (domainEl) {
    domainEl.textContent = domain.domain_name;
  }

  // Update role icon based on domain role
  const roleIcon = drawerElement.querySelector('[data-redirect-icon] .icon');
  if (roleIcon) {
    if (isAcceptor) {
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
  setupActionButtons(domain);

  // Render drawer content
  renderDrawerContent(domain);

  // Toggle footer based on role
  const donorFooter = drawerElement.querySelector('[data-footer-donor]');
  const acceptorFooter = drawerElement.querySelector('[data-footer-acceptor]');
  if (donorFooter) donorFooter.toggleAttribute('hidden', isAcceptor);
  if (acceptorFooter) acceptorFooter.toggleAttribute('hidden', !isAcceptor);

  // Setup acceptor form handlers if needed
  if (isAcceptor) {
    setupAcceptorFormHandlers();
  }

  // Show drawer via drawer manager (handles z-index stacking, escape key)
  drawerManager.open('redirect-inspector');
}

/**
 * Open drawer for bulk add redirects
 */
export function openBulkAddDrawer(): void {
  if (!drawerElement) return;

  currentDomain = null;

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

  // Show drawer via drawer manager
  drawerManager.open('redirect-inspector');
}

/**
 * Close drawer
 */
export function closeDrawer(): void {
  // Close via drawer manager (handles z-index stacking)
  drawerManager.close('redirect-inspector');
  currentDomain = null;
}

/**
 * Setup action buttons (copy, open in new tab, sync)
 */
function setupActionButtons(domain: ExtendedRedirectDomain): void {
  if (!drawerElement) return;

  // Copy button
  const copyBtn = drawerElement.querySelector('[data-action="copy-domain-drawer"]');
  if (copyBtn) {
    // Use onclick to replace any previous handler (prevents accumulation)
    (copyBtn as HTMLButtonElement).onclick = () => {
      navigator.clipboard.writeText(domain.domain_name).then(() => {
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
  }

  // Open in new tab button (test redirect)
  const openBtn = drawerElement.querySelector<HTMLButtonElement>('[data-action="open-domain-drawer"]');
  if (openBtn) {
    // Use onclick to replace any previous handler (prevents multiple tabs)
    openBtn.onclick = () => {
      window.open(`https://${domain.domain_name}`, '_blank', 'noopener,noreferrer');
    };

    // Color icon based on redirect code
    const icon = openBtn.querySelector('.icon');
    if (icon) {
      const targetUrl = getTargetUrl(domain.domain_name, domain.redirect);
      const hasRedirect = targetUrl && targetUrl.trim() !== '';
      const enabled = domain.redirect?.enabled ?? true;
      const redirectCode = domain.redirect?.status_code || 301;

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

  // Handle item selection (local UI only, Save persists)
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

      // Store value
      if (trigger) {
        trigger.setAttribute('data-selected-value', value || '301');
        trigger.setAttribute('data-status', value || '301');
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
 * Setup toggle handlers for enable/disable button (local UI only, Save persists)
 */
function setupToggleHandlers(): void {
  if (!drawerElement) return;

  const toggleBtn = drawerElement.querySelector('[data-drawer-toggle="enabled"]');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const currentEnabled = toggleBtn.getAttribute('data-enabled') === 'true';
    const newEnabled = !currentEnabled;

    // Update icon - remove old SVG and update data-icon
    const iconContainer = toggleBtn.querySelector('.icon');
    if (iconContainer) {
      const newIconName = `mono/${newEnabled ? 'check-circle' : 'close-circle'}`;
      iconContainer.setAttribute('data-icon', newIconName);

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
    updateSyncButtonState(currentDomain || undefined);
  });
}

/**
 * Setup input handlers for all dynamic template fields
 * Listens to `input` on every [data-drawer-field] element
 */
function setupFieldHandlers(): void {
  if (!drawerElement) return;

  const fields = drawerElement.querySelectorAll<HTMLInputElement>('[data-drawer-field]');
  fields.forEach(field => {
    field.addEventListener('input', () => {
      updateSyncButtonState(currentDomain || undefined);
    });
  });
}

/**
 * Setup template dropdown handler (only active for new redirects)
 * On selection: re-render fields, auto-set redirect code
 */
function setupTemplateDropdownHandler(): void {
  if (!drawerElement) return;

  const dropdown = drawerElement.querySelector('[data-dropdown="template-select"]');
  if (!dropdown) return; // Not present for existing redirects (read-only badge)

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
      const value = item.getAttribute('data-value') || 'T1';
      const itemLabel = item.querySelector('.dropdown__item-label')?.textContent?.trim();

      // Update selected state
      items.forEach((i) => i.classList.remove('is-active'));
      item.classList.add('is-active');

      // Update trigger label and value
      if (label && itemLabel) label.textContent = itemLabel;
      trigger.setAttribute('data-selected-value', value);

      // Close dropdown
      dropdown.classList.remove('dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');

      // Apply template change
      onTemplateChange(value);
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
 * Handle template change — re-render fields and auto-set redirect code
 */
function onTemplateChange(templateId: string): void {
  if (!drawerElement) return;

  const tpl = getTemplateConfig(templateId);

  // Re-render parameter fields
  const fieldsContainer = drawerElement.querySelector('[data-template-fields]');
  if (fieldsContainer) {
    // Get acceptor domain for pre-filling T1 target URL
    const acceptorDomain = currentDomain ? getAcceptorDomain(currentDomain.site_id) : null;
    const defaultTargetUrl = acceptorDomain ? `https://${acceptorDomain.domain_name}` : '';
    fieldsContainer.innerHTML = renderTemplateFields(templateId, defaultTargetUrl);

    // Re-attach field input listeners
    setupFieldHandlers();
  }

  // Auto-set redirect code to template default
  const codeTrigger = drawerElement.querySelector('[data-drawer-dropdown="redirect_code"]');
  if (codeTrigger) {
    const codeLabel = codeTrigger.querySelector('[data-selected-label]');
    const newCode = tpl.defaultCode.toString();
    codeTrigger.setAttribute('data-selected-value', newCode);
    codeTrigger.setAttribute('data-status', newCode);
    if (codeLabel) {
      codeLabel.textContent = newCode === '302' ? '302 - Temporary' : '301 - Permanent';
    }

    // Update active state in redirect code dropdown items
    const codeDropdown = drawerElement.querySelector('[data-dropdown="redirect-code"]');
    if (codeDropdown) {
      codeDropdown.querySelectorAll('.dropdown__item').forEach(item => {
        item.classList.toggle('is-active', item.getAttribute('data-value') === newCode);
      });
    }
  }

  // Update button states
  updateSyncButtonState(currentDomain || undefined);
}

/**
 * Collect params from all [data-drawer-field] inputs in the drawer
 */
function collectFieldParams(): Record<string, string> {
  const params: Record<string, string> = {};
  if (!drawerElement) return params;
  drawerElement.querySelectorAll<HTMLInputElement>('[data-drawer-field]').forEach(input => {
    const name = input.getAttribute('data-drawer-field');
    if (name) params[name] = input.value.trim();
  });
  return params;
}

/**
 * Validate that all collected field params have non-empty values
 */
function validateFieldParams(params: Record<string, string>): boolean {
  return Object.values(params).every(v => v !== '');
}

/**
 * Handle Save button click — collect all form values and persist to API
 */
async function handleSave(domain: ExtendedRedirectDomain): Promise<void> {
  if (!drawerElement) return;

  // Collect dynamic params from all template fields
  const params = collectFieldParams();

  // Validate all fields are filled
  if (!validateFieldParams(params)) {
    showGlobalNotice('error', 'Fill in all fields');
    return;
  }

  const redirectCodeTrigger = drawerElement.querySelector('[data-drawer-dropdown="redirect_code"]');
  const redirectCode = parseInt(redirectCodeTrigger?.getAttribute('data-selected-value') || '301') as 301 | 302;

  const toggleBtn = drawerElement.querySelector('[data-drawer-toggle="enabled"]');
  const enabled = toggleBtn?.getAttribute('data-enabled') === 'true';

  // Show progress on Save button
  const saveBtn = drawerElement.querySelector('[data-drawer-save]') as HTMLButtonElement;
  if (saveBtn) {
    saveBtn.disabled = true;
    const textSpan = saveBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = 'Saving...';
  }

  try {
    if (domain.redirect) {
      // Update existing redirect
      await safeCall(() => updateRedirect(domain.redirect!.id, {
        params,
        status_code: redirectCode,
        enabled,
      }), { lockKey: `redirect:update:${domain.redirect!.id}`, retryOn401: true });

      // Optimistic state update
      updateDomainRedirect(domain.domain_id, {
        params,
        status_code: redirectCode,
        enabled,
        sync_status: 'pending',
      });

      showGlobalNotice('success', 'Redirect saved');
    } else {
      // Create new redirect — read template_id from dropdown
      const templateTrigger = drawerElement.querySelector('[data-drawer-dropdown="template_id"]');
      const templateId = templateTrigger?.getAttribute('data-selected-value') || 'T1';

      const response = await safeCall(() => createRedirect(domain.domain_id, {
        template_id: templateId,
        params,
        status_code: redirectCode,
      }), { lockKey: `redirect:create:${domain.domain_id}`, retryOn401: true });

      // Add redirect to state
      addRedirectToDomain(domain.domain_id, {
        ...response.redirect,
        sync_status: 'pending' as const,
      }, 'donor');

      showGlobalNotice('success', 'Redirect created');
    }

    // Update sync status display and button states
    updateSyncStatusDisplay('pending');
    updateSyncButtonState(currentDomain || undefined);
  } catch (error: any) {
    showGlobalNotice('error', error.message || 'Failed to save redirect');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      const textSpan = saveBtn.querySelector('span:last-child');
      if (textSpan) textSpan.textContent = 'Save';
    }
  }
}

/**
 * Update Sync Status display in drawer without re-rendering entire card
 */
function updateSyncStatusDisplay(status: 'pending' | 'synced' | 'error' | 'never'): void {
  if (!drawerElement) return;

  const statusRow = drawerElement.querySelector('[data-sync-status-value]');
  if (statusRow) {
    const statusText = status === 'pending' ? 'Pending' :
                       status === 'synced' ? 'Synced' :
                       status === 'error' ? 'Failed' : 'Not synced';
    const statusColor = status === 'pending' ? 'text-warning' :
                        status === 'synced' ? 'text-success' :
                        status === 'error' ? 'text-danger' : 'text-muted';
    statusRow.className = statusColor;
    statusRow.textContent = statusText;
  }
}

/**
 * Update footer buttons based on current form state
 * - Enabled redirect: show Sync button
 * - Disabled redirect: show Delete button
 */
function updateSyncButtonState(domain?: ExtendedRedirectDomain): void {
  if (!drawerElement) return;

  const saveBtn = drawerElement.querySelector('[data-drawer-save]') as HTMLButtonElement;
  const syncBtn = drawerElement.querySelector('[data-drawer-sync]') as HTMLButtonElement;
  const deleteBtn = drawerElement.querySelector('[data-drawer-delete]') as HTMLButtonElement;
  if (!syncBtn || !deleteBtn) return;

  // Check all dynamic fields have values
  const params = collectFieldParams();
  const allFieldsFilled = validateFieldParams(params);

  // Check current toggle state
  const toggleBtn = drawerElement.querySelector('[data-drawer-toggle="enabled"]');
  const currentEnabled = toggleBtn?.getAttribute('data-enabled') !== 'false';

  // Check if redirect exists in DB
  const hasRedirect = domain?.redirect !== null && domain?.redirect !== undefined;

  if (!currentEnabled && hasRedirect) {
    // Disabled redirect with existing record → show Save + Delete, hide Sync
    if (saveBtn) { saveBtn.removeAttribute('hidden'); saveBtn.disabled = !allFieldsFilled; }
    syncBtn.setAttribute('hidden', '');
    deleteBtn.removeAttribute('hidden');
    deleteBtn.disabled = false;
  } else {
    // Enabled or no redirect yet → show Save + Sync, hide Delete
    deleteBtn.setAttribute('hidden', '');
    if (saveBtn) { saveBtn.removeAttribute('hidden'); saveBtn.disabled = !allFieldsFilled; }
    syncBtn.removeAttribute('hidden');

    // Sync available when all fields are filled (saves first, then syncs)
    if (!allFieldsFilled) {
      syncBtn.disabled = true;
      syncBtn.title = 'Fill in all fields first';
    } else {
      syncBtn.disabled = false;
      syncBtn.title = hasRedirect ? 'Save and sync to Cloudflare' : 'Create and sync to Cloudflare';
    }
  }
}

/**
 * Setup acceptor form handlers (status dropdown)
 */
function setupAcceptorFormHandlers(): void {
  if (!drawerElement) return;

  const dropdown = drawerElement.querySelector('[data-dropdown="site-status-inline"]');
  if (!dropdown) return;

  const trigger = dropdown.querySelector('.dropdown__trigger');
  const menu = dropdown.querySelector('.dropdown__menu');
  const items = dropdown.querySelectorAll('.dropdown__item');
  const label = dropdown.querySelector('[data-status-label]');
  const hiddenInput = drawerElement.querySelector('[data-status-value]') as HTMLInputElement;

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
      const value = item.getAttribute('data-value') || 'active';
      const text = item.textContent?.trim() || 'Active';

      // Update selected state
      items.forEach((i) => i.classList.remove('is-active'));
      item.classList.add('is-active');

      // Update label and hidden input
      if (label) label.textContent = text;
      if (hiddenInput) hiddenInput.value = value;
      if (trigger) {
        trigger.setAttribute('data-selected-value', value);
        trigger.setAttribute('data-status', value);
      }

      // Close dropdown
      dropdown.classList.remove('dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  const closeHandler = (e: Event) => {
    if (!dropdown.contains(e.target as Node)) {
      dropdown.classList.remove('dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  };
  document.addEventListener('click', closeHandler);
}

/**
 * Handle save site (acceptor form submission)
 */
async function handleSaveSite(): Promise<void> {
  if (!drawerElement) {
    return;
  }

  const form = drawerElement.querySelector('[data-form="edit-site-inline"]') as HTMLFormElement;
  if (!form) {
    return;
  }

  // Get site ID from form (set from fetched site data)
  const siteIdInput = form.querySelector('[name="site_id"]') as HTMLInputElement;
  const siteId = siteIdInput ? parseInt(siteIdInput.value, 10) : 0;
  if (!siteId) {
    showGlobalNotice('error', 'No site ID found');
    return;
  }

  const siteName = (form.querySelector('[name="site_name"]') as HTMLInputElement)?.value?.trim();
  const siteTag = (form.querySelector('[name="site_tag"]') as HTMLInputElement)?.value?.trim();
  const status = (form.querySelector('[data-status-value]') as HTMLInputElement)?.value || 'active';

  if (!siteName) {
    showGlobalNotice('error', 'Site name is required');
    return;
  }

  const saveBtn = drawerElement.querySelector('[data-drawer-save-site]') as HTMLButtonElement;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.setAttribute('data-turnstile-pending', '');
  }

  try {
    await safeCall(
      () => updateSite(siteId, {
        site_name: siteName,
        site_tag: siteTag || undefined,
        status: status as 'active' | 'paused' | 'archived',
      }),
      {
        lockKey: `update-site-${siteId}`,
        retryOn401: true,
      }
    );

    // Update site context in state (optimistic, triggers re-render)
    updateSiteContext(siteId, {
      siteName: siteName,
      siteTag: siteTag || null,
      siteStatus: status as 'active' | 'paused' | 'archived',
    });

    showGlobalNotice('success', 'Site updated');
    closeDrawer();
  } catch (error: any) {
    showGlobalNotice('error', error.message || 'Failed to update site');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.removeAttribute('data-turnstile-pending');
    }
  }
}

/**
 * Render content for acceptor (target/primary) domain
 * Shows site overview and edit form in card sections
 * Uses currentSite (fetched from API) for accurate site data
 */
function renderAcceptorContent(domain: ExtendedRedirectDomain): string {
  // Use fetched site data if available, otherwise fall back to domain data
  const site = currentSite;

  // Site type config (label and badge style) - matches table badges
  const siteTypeConfig: Record<string, { label: string; badge: string }> = {
    landing: { label: 'Landing', badge: 'badge--success' },
    tds: { label: 'TDS', badge: 'badge--brand' },
    hybrid: { label: 'Hybrid', badge: 'badge--warning' },
  };
  const siteType = site?.site_type || 'landing';
  const typeConfig = siteTypeConfig[siteType] || siteTypeConfig.landing;

  // Site data from API (preferred) or domain data (fallback)
  const siteName = site?.site_name || domain.site_name || '';
  const siteTag = site?.site_tag || '';
  const siteStatus = site?.status || 'active';
  const siteId = site?.id || domain.site_id;

  // Status config (label and border color)
  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'var(--ok)' },
    paused: { label: 'Paused', color: 'var(--warning)' },
    archived: { label: 'Archived', color: 'var(--muted)' },
  };
  const currentStatusConfig = statusConfig[siteStatus] || statusConfig.active;

  return `
    <div class="stack-list">
      <!-- Overview Card -->
      <section class="card card--panel">
        <header class="card__header cluster cluster--space-between">
          <h3 class="h5">Overview</h3>
          <span class="badge badge--sm ${typeConfig.badge}">${typeConfig.label}</span>
        </header>
      </section>

      <!-- Site Settings Card -->
      <section class="card card--panel">
        <header class="card__header">
          <h3 class="h5">Site Settings</h3>
        </header>
        <div class="card__body">
          <form class="stack-list" data-form="edit-site-inline">
            <input type="hidden" name="site_id" value="${siteId}" />

            <div class="field">
              <label class="field__label">
                <span>Site name</span>
                <span class="field__required">*</span>
              </label>
              <input
                class="input"
                type="text"
                name="site_name"
                value="${siteName}"
                placeholder="My Landing Page"
                autocomplete="off"
                required
              />
            </div>

            <div class="field">
              <label class="field__label">Site tag</label>
              <input
                class="input"
                type="text"
                name="site_tag"
                value="${siteTag}"
                placeholder="e.g., promo-2025"
                autocomplete="off"
              />
            </div>

            <div class="field">
              <label class="field__label">Status</label>
              <div class="dropdown" data-dropdown="site-status-inline">
                <button
                  class="btn-chip btn-chip--dropdown dropdown__trigger"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded="false"
                  data-selected-value="${siteStatus}"
                  data-status="${siteStatus}"
                >
                  <span class="btn-chip__label" data-status-label>${currentStatusConfig.label}</span>
                  <span class="btn-chip__chevron icon" data-icon="mono/chevron-down"></span>
                </button>
                <div class="dropdown__menu dropdown__menu--fit-trigger" role="menu">
                  <button class="dropdown__item ${siteStatus === 'active' ? 'is-active' : ''}" type="button" data-value="active">Active</button>
                  <button class="dropdown__item ${siteStatus === 'paused' ? 'is-active' : ''}" type="button" data-value="paused">Paused</button>
                  <button class="dropdown__item ${siteStatus === 'archived' ? 'is-active' : ''}" type="button" data-value="archived">Archived</button>
                </div>
              </div>
              <input type="hidden" name="status" value="${siteStatus}" data-status-value />
            </div>
          </form>
        </div>
      </section>

      ${renderAcceptorRedirectCard(domain)}
    </div>
  `;
}

/**
 * Render canonical redirect info card (shared by acceptor and donor)
 * Shows template, target, sync status, and delete button
 */
function renderCanonicalInfoCard(
  canonical: NonNullable<ExtendedRedirectDomain['canonical_redirect']>,
  domainName: string,
  domainId: number,
): string {
  const templateLabels: Record<string, string> = {
    T3: 'apex \u2192 www',
    T4: 'www \u2192 apex',
  };
  const templateLabel = templateLabels[canonical.template_id] || canonical.template_id || 'Custom';
  const targetUrl = getTargetUrl(domainName, canonical) || '';

  const syncStatus = canonical.sync_status || 'pending';
  const syncStatusText = syncStatus === 'synced' ? 'Synced' :
                         syncStatus === 'pending' ? 'Pending' :
                         syncStatus === 'error' ? 'Failed' : 'Not synced';
  const syncStatusColor = syncStatus === 'synced' ? 'text-success' :
                          syncStatus === 'pending' ? 'text-warning' :
                          syncStatus === 'error' ? 'text-danger' : 'text-muted';
  const lastSync = canonical.updated_at
    ? new Date(canonical.updated_at).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Never';

  return `
    <section class="card card--panel">
      <header class="card__header">
        <h3 class="h5">Canonical Redirect</h3>
      </header>
      <div class="card__body">
        <dl class="detail-list">
          <div class="detail-row">
            <dt class="detail-label">Template</dt>
            <dd class="detail-value">
              <span class="badge badge--sm badge--neutral">${templateLabel}</span>
            </dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Target</dt>
            <dd class="detail-value text-sm">${targetUrl}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Sync</dt>
            <dd class="detail-value">
              <span class="${syncStatusColor}">${syncStatusText}</span>
              <span class="text-muted text-sm">${lastSync}</span>
            </dd>
          </div>
          ${(canonical as any).last_error ? `
            <div class="detail-row">
              <dt class="detail-label">Error</dt>
              <dd class="detail-value">
                <span class="text-danger text-sm">${(canonical as any).last_error}</span>
              </dd>
            </div>
          ` : ''}
        </dl>
        <div class="stack--sm">
          <button class="btn btn--sm btn--danger" type="button" data-action="delete-canonical" data-redirect-id="${canonical.id}" data-domain-id="${domainId}">
            <span class="icon" data-icon="mono/trash"></span>
            <span>Delete redirect</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render canonical redirect buttons card (shared by acceptor and donor)
 * Shows T3/T4 action buttons to create canonical redirect
 */
function renderCanonicalButtonsCard(siteId: number, domain: string): string {
  // Smart default: www domains → T4 (www→apex), non-www → T3 (apex→www)
  const isWww = domain.startsWith('www.');
  const defaultTemplate = isWww ? 't4' : 't3';
  const defaultLabel = isWww ? 'www \u2192 apex' : 'apex \u2192 www';

  return `
    <section class="card card--panel">
      <header class="card__header">
        <h3 class="h5">Canonical Redirect</h3>
      </header>
      <div class="card__body">
        <p class="text-muted text-sm">Set up www normalization for this domain.</p>
        <div class="cluster cluster--sm">
          <div class="dropdown" data-dropdown="canonical-direction">
            <button
              class="btn-chip btn-chip--sm btn-chip--dropdown dropdown__trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded="false"
              data-selected-value="${defaultTemplate}"
            >
              <span class="btn-chip__label" data-selected-label>${defaultLabel}</span>
              <span class="btn-chip__chevron icon" data-icon="mono/chevron-down"></span>
            </button>
            <div class="dropdown__menu dropdown__menu--fit-trigger" role="menu">
              <button class="dropdown__item ${defaultTemplate === 't4' ? 'is-active' : ''}" type="button" data-value="t4">www \u2192 apex</button>
              <button class="dropdown__item ${defaultTemplate === 't3' ? 'is-active' : ''}" type="button" data-value="t3">apex \u2192 www</button>
            </div>
          </div>
          <button class="btn btn--sm btn--primary" type="button" data-action="apply-canonical" data-site-id="${siteId}">
            Apply
          </button>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render canonical redirect card for acceptor domain
 * Uses redirect.canonical_redirect (deduped field) instead of raw state lookup
 */
function renderAcceptorRedirectCard(domain: ExtendedRedirectDomain): string {
  const canonical = domain.canonical_redirect;
  if (canonical) {
    return renderCanonicalInfoCard(canonical, domain.domain_name, domain.domain_id);
  }
  return renderCanonicalButtonsCard(domain.site_id, domain.domain_name);
}

/**
 * Unified handler for canonical redirect cards (both acceptor and donor)
 * Handles: T3/T4 create buttons + delete canonical button
 */
function setupCanonicalCardHandlers(domain: ExtendedRedirectDomain): void {
  if (!drawerElement) return;

  // Canonical direction dropdown
  const canonicalDropdown = drawerElement.querySelector('[data-dropdown="canonical-direction"]');
  if (canonicalDropdown) {
    const trigger = canonicalDropdown.querySelector('.dropdown__trigger');
    const menu = canonicalDropdown.querySelector('.dropdown__menu');
    const items = canonicalDropdown.querySelectorAll('.dropdown__item');
    const label = canonicalDropdown.querySelector('[data-selected-label]');

    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = canonicalDropdown.classList.contains('dropdown--open');
        canonicalDropdown.classList.toggle('dropdown--open', !isOpen);
        trigger.setAttribute('aria-expanded', (!isOpen).toString());
      });

      items.forEach((item) => {
        item.addEventListener('click', () => {
          const value = item.getAttribute('data-value');
          const text = item.textContent?.trim();
          items.forEach((i) => i.classList.remove('is-active'));
          item.classList.add('is-active');
          if (label && text) label.textContent = text;
          if (trigger) trigger.setAttribute('data-selected-value', value || 't3');
          canonicalDropdown.classList.remove('dropdown--open');
          trigger.setAttribute('aria-expanded', 'false');
        });
      });

      document.addEventListener('click', (e) => {
        if (!canonicalDropdown.contains(e.target as Node)) {
          canonicalDropdown.classList.remove('dropdown--open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // Apply canonical button (reads selected direction from dropdown)
  const applyBtn = drawerElement.querySelector<HTMLButtonElement>('[data-action="apply-canonical"]');
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      const trigger = drawerElement!.querySelector('[data-dropdown="canonical-direction"] .dropdown__trigger');
      const template = (trigger?.getAttribute('data-selected-value') || 't3') as 't3' | 't4';
      const templateId = template.toUpperCase();
      const templateName = template === 't3' ? 'apex \u2192 www' : 'www \u2192 apex';

      applyBtn.disabled = true;

      try {
        const response = await safeCall(() => createRedirect(domain.domain_id, {
          template_id: templateId,
          params: {},
        }), { lockKey: `redirect:create:${domain.domain_id}:canonical`, retryOn401: true });

        addCanonicalToDomain(domain.domain_id, response.redirect);
        showGlobalNotice('success', `Applied "${templateName}" to ${domain.domain_name}`);

        if (currentDomain) {
          currentDomain = {
            ...currentDomain,
            canonical_redirect: response.redirect,
          };
          renderDrawerContent(currentDomain);
          if (currentDomain.domain_role === 'acceptor') {
            setupAcceptorFormHandlers();
          }
          updateSyncButtonState(currentDomain);
        }
      } catch (error: any) {
        showGlobalNotice('error', error.message || `Failed to apply "${templateName}"`);
        applyBtn.disabled = false;
      }
    });
  }

  // Delete canonical redirect button
  const deleteBtn = drawerElement.querySelector<HTMLButtonElement>('[data-action="delete-canonical"]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const redirectId = Number(deleteBtn.dataset.redirectId);
      const domainId = Number(deleteBtn.dataset.domainId);
      if (!redirectId || !domainId) return;

      // Confirm before deleting
      const confirmed = await showConfirmDialog('delete-redirect', {
        'delete-domain': currentDomain?.domain_name || 'this domain',
      });
      if (!confirmed) return;

      deleteBtn.disabled = true;
      try {
        await safeCall(() => deleteRedirect(redirectId), { lockKey: `redirect:delete:${redirectId}`, retryOn401: true });
        removeCanonicalFromDomain(domainId);
        showGlobalNotice('success', 'Canonical redirect removed');

        // Sync zone to remove rule from Cloudflare
        const state = getState();
        const fresh = state.domains.find(d => d.domain_id === domainId);
        if (fresh?.zone_id) {
          try {
            await safeCall(() => applyZoneRedirects(fresh.zone_id), { lockKey: `zone:sync:${fresh.zone_id}`, retryOn401: true });
          } catch {
            console.warn('[Drawer] Zone sync after canonical delete failed');
          }
        }

        // Update currentDomain and re-render
        if (currentDomain) {
          currentDomain = {
            ...currentDomain,
            canonical_redirect: null,
          };
          renderDrawerContent(currentDomain);
          if (currentDomain.domain_role === 'acceptor') {
            setupAcceptorFormHandlers();
          }
          updateSyncButtonState(currentDomain);
        }
      } catch (error: any) {
        showGlobalNotice('error', error.message || 'Failed to delete redirect');
        deleteBtn.disabled = false;
      }
    });
  }
}

/**
 * Render content for donor (redirect) domain
 * Layout: Redirect Configuration + Canonical Redirect + Sync Status
 */
function renderDonorContent(
  domain: ExtendedRedirectDomain,
  _acceptorDomain: ReturnType<typeof getAcceptorDomain>,
  defaultTargetUrl: string
): string {
  return `
    <div class="stack-list">
      ${renderRedirectConfigCard(domain, defaultTargetUrl)}
      ${renderDonorCanonicalCard(domain)}
      ${renderSyncStatusCard(domain)}
    </div>
  `;
}

/**
 * Render canonical redirect card for donor domain
 * Two states: has canonical → info card, no canonical → T3/T4 buttons
 */
function renderDonorCanonicalCard(domain: ExtendedRedirectDomain): string {
  const canonical = domain.canonical_redirect;
  if (canonical) {
    return renderCanonicalInfoCard(canonical, domain.domain_name, domain.domain_id);
  }
  return renderCanonicalButtonsCard(domain.site_id, domain.domain_name);
}

/**
 * Render drawer content with cards and detail-list
 */
function renderDrawerContent(domain: ExtendedRedirectDomain): void {
  const contentEl = drawerElement?.querySelector('[data-drawer-content]');
  if (!contentEl) return;

  const isAcceptor = domain.domain_role === 'acceptor';

  // Get acceptor domain for this site (for pre-filling target URL)
  const acceptorDomain = getAcceptorDomain(domain.site_id);
  const defaultTargetUrl = acceptorDomain
    ? `https://${acceptorDomain.domain_name}`
    : '';

  const content = isAcceptor
    ? renderAcceptorContent(domain)
    : renderDonorContent(domain, acceptorDomain, defaultTargetUrl);

  contentEl.innerHTML = content;

  // Setup dropdown, toggle, and input handlers after content is rendered (donor only)
  setupDropdownHandlers();
  setupToggleHandlers();
  setupTemplateDropdownHandler();
  setupFieldHandlers();

  // Setup canonical redirect card handlers (T3/T4 create + delete) — unified for both roles
  setupCanonicalCardHandlers(domain);
}

/**
 * Look up a DONOR_TEMPLATES entry by id (falls back to T1)
 */
function getTemplateConfig(templateId: string) {
  return DONOR_TEMPLATES.find(t => t.id === templateId) || DONOR_TEMPLATES[0];
}

/**
 * Render the template dropdown (for new redirects) or a read-only badge (for existing)
 */
function renderTemplateRow(domain: ExtendedRedirectDomain): string {
  const hasRedirect = domain.redirect !== null && domain.redirect !== undefined;

  if (hasRedirect) {
    // Existing redirect — read-only badge
    const tpl = getTemplateConfig(domain.redirect!.template_id);
    return `
      <div class="detail-row detail-row--center">
        <dt class="detail-label">Template</dt>
        <dd class="detail-value">
          <span class="badge badge--sm badge--neutral">${tpl.label}</span>
        </dd>
      </div>
    `;
  }

  // New redirect — interactive dropdown, default T1
  const defaultTpl = DONOR_TEMPLATES[0];
  return `
    <div class="detail-row detail-row--center">
      <dt class="detail-label">Template</dt>
      <dd class="detail-value">
        <div class="dropdown" data-dropdown="template-select">
          <button
            class="btn-chip btn-chip--sm btn-chip--dropdown dropdown__trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded="false"
            data-drawer-dropdown="template_id"
            data-selected-value="${defaultTpl.id}"
          >
            <span class="btn-chip__label" data-selected-label>${defaultTpl.label}</span>
            <span class="btn-chip__chevron icon" data-icon="mono/chevron-down"></span>
          </button>
          <div class="dropdown__menu dropdown__menu--auto" role="menu">
            ${DONOR_TEMPLATES.map((tpl, i) => `
              ${tpl.id === 'T7' ? '<hr class="dropdown__divider" />' : ''}
              <button
                class="dropdown__item dropdown__item--rich ${i === 0 ? 'is-active' : ''}"
                type="button"
                role="menuitem"
                data-value="${tpl.id}"
              >
                <span class="dropdown__item-label">${tpl.label}</span>
                <span class="dropdown__item-hint">${tpl.hint}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </dd>
    </div>
  `;
}

/**
 * Render the dynamic parameter fields for a given template
 */
function renderTemplateFields(
  templateId: string,
  defaultTargetUrl: string,
  existingParams?: Record<string, any>,
): string {
  const tpl = getTemplateConfig(templateId);
  return tpl.fields.map(field => {
    // Resolve value: existing param > pre-fill for target_url on T1 > empty
    let value = existingParams?.[field.name] || '';
    if (!value && field.name === 'target_url' && templateId === 'T1') {
      value = defaultTargetUrl;
    }

    return `
      <div class="field">
        <label class="field__label">
          ${field.label}
          ${!value && field.name === 'target_url' && templateId === 'T1' && defaultTargetUrl
            ? '<span class="field__hint">Pre-filled with main domain</span>'
            : ''}
        </label>
        <input
          type="text"
          class="input"
          placeholder="${field.placeholder}"
          value="${value}"
          data-drawer-field="${field.name}"
        />
      </div>
    `;
  }).join('');
}

/**
 * Render redirect configuration card (for redirect domains)
 * @param redirect - Domain redirect data
 * @param defaultTargetUrl - Pre-filled target URL (usually acceptor domain)
 */
function renderRedirectConfigCard(domain: ExtendedRedirectDomain, defaultTargetUrl: string = ''): string {
  const redirectCode = domain.redirect?.status_code || 301;
  const enabled = domain.redirect?.enabled ?? true;
  const hasRedirect = domain.redirect !== null && domain.redirect !== undefined;
  const isNewRedirect = !hasRedirect;
  const templateId = domain.redirect?.template_id || 'T1';

  const redirectCodeLabel = redirectCode === 301 ? '301 - Permanent' : '302 - Temporary';

  return `
    <section class="card card--panel">
      <header class="card__header">
        <h3 class="h5">${isNewRedirect ? 'Create Redirect' : 'Redirect Configuration'}</h3>
      </header>
      <div class="card__body">
        <div class="stack-list">
          ${renderTemplateRow(domain)}

          <div data-template-fields>
            ${renderTemplateFields(templateId, defaultTargetUrl, domain.redirect?.params)}
          </div>

          <div class="detail-row detail-row--center">
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
                  data-status="${redirectCode}"
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

          <div class="detail-row detail-row--center">
            <dt class="detail-label">Status</dt>
            <dd class="detail-value">
              <button
                class="btn btn--sm btn--outline"
                type="button"
                data-drawer-toggle="enabled"
                data-enabled="${enabled}"
              >
                <span class="icon" data-icon="mono/${enabled ? 'check-circle' : 'close-circle'}"></span>
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
function renderSyncStatusCard(domain: ExtendedRedirectDomain): string {
  const lastSync = domain.redirect?.updated_at
    ? new Date(domain.redirect.updated_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Never';

  // Use sync_status field for accurate status display
  const syncStatus = domain.redirect?.sync_status || 'never';
  const syncStatusText = syncStatus === 'synced' ? 'Synced' :
                         syncStatus === 'pending' ? 'Pending' :
                         syncStatus === 'error' ? 'Failed' : 'Not synced';
  const syncStatusColor = syncStatus === 'synced' ? 'text-success' :
                          syncStatus === 'pending' ? 'text-warning' :
                          syncStatus === 'error' ? 'text-danger' : 'text-muted';

  const syncError: string | null = null; // API doesn't expose error in list view

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
              <span class="${syncStatusColor}" data-sync-status-value>${syncStatusText}</span>
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
 * Saves current form values first, then syncs zone to Cloudflare
 */
async function handleSync(domain: ExtendedRedirectDomain): Promise<void> {
  if (!drawerElement) return;

  // Collect dynamic params from all template fields
  const params = collectFieldParams();

  if (!validateFieldParams(params)) {
    showGlobalNotice('error', 'Fill in all fields');
    return;
  }

  const redirectCodeTrigger = drawerElement.querySelector('[data-drawer-dropdown="redirect_code"]');
  const redirectCode = parseInt(redirectCodeTrigger?.getAttribute('data-selected-value') || '301') as 301 | 302;

  const toggleBtn = drawerElement.querySelector('[data-drawer-toggle="enabled"]');
  const enabled = toggleBtn?.getAttribute('data-enabled') === 'true';

  // Get zone_id
  if (!domain.zone_id) {
    showGlobalNotice('error', 'Domain is not associated with a Cloudflare zone');
    return;
  }

  // Update sync button to show progress with shimmer
  const syncBtn = drawerElement.querySelector('[data-drawer-sync]') as HTMLButtonElement;
  const saveBtn = drawerElement.querySelector('[data-drawer-save]') as HTMLButtonElement;
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.setAttribute('data-turnstile-pending', '');
    const textSpan = syncBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = 'Saving...';
  }
  if (saveBtn) saveBtn.disabled = true;

  try {
    // Step 1: Save form values to backend
    if (domain.redirect) {
      await safeCall(() => updateRedirect(domain.redirect!.id, {
        params,
        status_code: redirectCode,
        enabled,
      }), { lockKey: `redirect:update:${domain.redirect!.id}`, retryOn401: true });
      updateDomainRedirect(domain.domain_id, {
        params,
        status_code: redirectCode,
        enabled,
        sync_status: 'pending',
      });
    } else {
      // Read template_id from dropdown
      const templateTrigger = drawerElement!.querySelector('[data-drawer-dropdown="template_id"]');
      const templateId = templateTrigger?.getAttribute('data-selected-value') || 'T1';

      const createResponse = await safeCall(() => createRedirect(domain.domain_id, {
        template_id: templateId,
        params,
        status_code: redirectCode,
      }), { lockKey: `redirect:create:${domain.domain_id}`, retryOn401: true });
      addRedirectToDomain(domain.domain_id, {
        ...createResponse.redirect,
        sync_status: 'pending' as const,
      }, 'donor');
    }

    // Step 2: Sync to Cloudflare
    if (syncBtn) {
      const textSpan = syncBtn.querySelector('span:last-child');
      if (textSpan) textSpan.textContent = 'Syncing...';
    }

    const response = await safeCall(() => applyZoneRedirects(domain.zone_id!), { lockKey: `zone:sync:${domain.zone_id}`, retryOn401: true });

    // Update state with synced redirects
    const syncedIds = response.synced_rules?.map(r => r.id) || [];
    markZoneSynced(domain.zone_id!, syncedIds);

    showGlobalNotice('success', `Synced ${response.rules_applied || 1} redirect(s) to Cloudflare`);

    // Remove shimmer
    if (syncBtn) syncBtn.removeAttribute('data-turnstile-pending');

    // Refresh state to get latest data
    await refreshRedirects();

    // Close drawer after successful sync
    closeDrawer();
  } catch (error: any) {
    console.error('[handleSync] Error:', error);

    // Mark as error if redirect exists
    if (domain.redirect || currentDomain?.redirect) {
      updateDomainRedirect(domain.domain_id, { sync_status: 'error' });
    }

    showGlobalNotice('error', error.message || 'Failed to sync to Cloudflare');

    // Remove shimmer and update button state
    if (syncBtn) {
      syncBtn.removeAttribute('data-turnstile-pending');
      const textSpan = syncBtn.querySelector('span:last-child');
      if (textSpan) textSpan.textContent = 'Retry';
    }
    if (saveBtn) saveBtn.disabled = false;
    updateSyncButtonState(currentDomain || domain);
  }
}

/**
 * Handle delete button click (footer button)
 * Deletes disabled redirect from DB, then syncs zone to remove from CF
 */
async function handleDelete(domain: ExtendedRedirectDomain): Promise<void> {
  if (!drawerElement || !domain.redirect?.id) return;

  const redirectId = domain.redirect.id;

  // Update delete button to show progress with shimmer
  const deleteBtn = drawerElement.querySelector('[data-drawer-delete]') as HTMLButtonElement;
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.setAttribute('data-turnstile-pending', '');
    const textSpan = deleteBtn.querySelector('span:last-child');
    if (textSpan) textSpan.textContent = 'Deleting...';
  }

  try {
    // Step 1: Delete redirect from DB
    await safeCall(() => deleteRedirect(redirectId), { lockKey: `redirect:delete:${redirectId}`, retryOn401: true });

    // Remove from local state
    removeRedirectFromDomain(domain.domain_id);

    showGlobalNotice('success', 'Redirect deleted');

    // Step 2: If zone exists, sync to remove from CF
    if (domain.zone_id) {
      try {
        await safeCall(() => applyZoneRedirects(domain.zone_id), { lockKey: `zone:sync:${domain.zone_id}`, retryOn401: true });
      } catch (syncError) {
        // Non-critical: redirect is deleted from DB, CF sync can be retried
        console.warn('[handleDelete] Zone sync failed:', syncError);
      }
    }

    // Refresh state and close drawer
    await refreshRedirects();
    closeDrawer();
  } catch (error: any) {
    console.error('[handleDelete] Error:', error);
    showGlobalNotice('error', error.message || 'Failed to delete redirect');

    // Reset delete button
    if (deleteBtn) {
      deleteBtn.removeAttribute('data-turnstile-pending');
      deleteBtn.disabled = false;
      const textSpan = deleteBtn.querySelector('span:last-child');
      if (textSpan) textSpan.textContent = 'Delete redirect';
    }
  }
}
