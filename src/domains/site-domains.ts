/**
 * Site Domains Management
 * Handles attach/detach domain operations for sites
 */

import { getAuthState } from '@state/auth-state';
import { getSite, attachDomain, detachDomain } from '@api/sites';
import type { Site, Domain } from '@api/types';
import * as domainsAPI from '@api/domains';
import { t } from '@i18n';
import { logError, logDebug } from '@utils/logger';
import { showGlobalMessage } from '@ui/notifications';

let currentSiteId: number | null = null;
let currentProjectId: number | null = null;

/**
 * Open manage site domains drawer
 */
export function openManageSiteDomainsDrawer(siteId: number): void {
  currentSiteId = siteId;
  const drawer = document.querySelector<HTMLElement>('[data-drawer="manage-site-domains"]');
  if (!drawer) {
    logDebug('Manage site domains drawer not found');
    return;
  }

  drawer.removeAttribute('hidden');
  loadSiteAndDomains(siteId);
}

/**
 * Close manage site domains drawer
 */
export function closeManageSiteDomainsDrawer(): void {
  const drawer = document.querySelector<HTMLElement>('[data-drawer="manage-site-domains"]');
  if (!drawer) return;

  drawer.setAttribute('hidden', '');
  currentSiteId = null;
  currentProjectId = null;

  // Reset UI
  const nameEl = drawer.querySelector<HTMLElement>('[data-site-domains-name]');
  if (nameEl) nameEl.textContent = '—';

  const countEl = drawer.querySelector<HTMLElement>('[data-site-domains-count]');
  if (countEl) countEl.textContent = '0';

  const tbody = drawer.querySelector<HTMLTableSectionElement>('[data-site-domains-table] tbody');
  if (tbody) tbody.innerHTML = '';
}

/**
 * Load site details and domains
 */
async function loadSiteAndDomains(siteId: number): Promise<void> {
  const { accountId } = getAuthState();
  if (!accountId) {
    showGlobalMessage('error', 'Account ID not found');
    return;
  }

  try {
    // Load site details
    const site = await getSite(siteId);
    currentProjectId = site.project_id;

    // Update drawer title
    const nameEl = document.querySelector<HTMLElement>('[data-site-domains-name]');
    if (nameEl) nameEl.textContent = site.site_name;

    // Load attached domains
    await loadAttachedDomains(accountId, siteId);

    // Load available domains for dropdown
    await loadAvailableDomains(accountId, site.project_id);
  } catch (error) {
    logError('Failed to load site domains:', error);
    showGlobalMessage('error', 'Failed to load site details');
  }
}

/**
 * Load domains attached to the site
 */
async function loadAttachedDomains(accountId: number, siteId: number): Promise<void> {
  const loadingEl = document.querySelector<HTMLElement>('[data-site-domains-loading]');
  const emptyEl = document.querySelector<HTMLElement>('[data-site-domains-empty]');
  const tableContainer = document.querySelector<HTMLElement>('[data-site-domains-table-container]');
  const tbody = document.querySelector<HTMLTableSectionElement>('[data-site-domains-table] tbody');

  if (!tbody || !tableContainer || !emptyEl) return;

  // Show loading
  if (loadingEl) loadingEl.removeAttribute('hidden');
  tableContainer.setAttribute('hidden', '');
  emptyEl.setAttribute('hidden', '');

  try {
    // Get all domains and filter by site_id
    const allDomains = await domainsAPI.getDomains(accountId);
    const attachedDomains = allDomains.filter(d => d.site_id === siteId);

    // Update count
    const countEl = document.querySelector<HTMLElement>('[data-site-domains-count]');
    if (countEl) countEl.textContent = String(attachedDomains.length);

    // Hide loading
    if (loadingEl) loadingEl.setAttribute('hidden', '');

    if (attachedDomains.length === 0) {
      emptyEl.removeAttribute('hidden');
      return;
    }

    // Render table rows
    tbody.innerHTML = attachedDomains.map(renderDomainRow).join('');
    tableContainer.removeAttribute('hidden');
  } catch (error) {
    logError('Failed to load attached domains:', error);
    if (loadingEl) loadingEl.setAttribute('hidden', '');
    emptyEl.removeAttribute('hidden');
  }
}

/**
 * Render a domain table row
 */
function renderDomainRow(domain: Domain): string {
  return `
    <tr>
      <td>
        <div class="domain-cell">
          <span class="domain-cell__name">${domain.domain_name}</span>
        </div>
      </td>
      <td>
        <span class="badge badge--${domain.status === 'active' ? 'success' : 'neutral'}">
          ${domain.status || 'Unknown'}
        </span>
      </td>
      <td class="td-actions">
        <button
          class="btn-icon"
          type="button"
          data-action="detach-domain"
          data-domain-id="${domain.domain_id}"
          aria-label="${t('sites.domains.detachButton')}"
          title="${t('sites.domains.detachButton')}"
        >
          <span class="icon" data-icon="mono/cancel"></span>
        </button>
      </td>
    </tr>
  `;
}

/**
 * Load available domains for the dropdown (same project, not attached)
 */
async function loadAvailableDomains(accountId: number, projectId: number): Promise<void> {
  const menu = document.querySelector<HTMLElement>('[data-attach-domain-menu]');
  if (!menu) return;

  try {
    // Get all domains in the project
    const allDomains = await domainsAPI.getDomains(accountId);
    const projectDomains = allDomains.filter(d => d.project_id === projectId);

    // Filter out domains already attached to current site
    const availableDomains = projectDomains.filter(d => d.site_id !== currentSiteId);

    if (availableDomains.length === 0) {
      menu.innerHTML = `
        <div class="dropdown__item dropdown__item--disabled">
          <span class="text-muted">${t('sites.domains.empty')}</span>
        </div>
      `;
      return;
    }

    // Render dropdown options
    menu.innerHTML = availableDomains
      .map(
        domain => `
      <button
        class="dropdown__item"
        type="button"
        role="menuitem"
        data-value="${domain.domain_id}"
      >
        ${domain.domain_name}
      </button>
    `,
      )
      .join('');
  } catch (error) {
    logError('Failed to load available domains:', error);
    menu.innerHTML = `
      <div class="dropdown__item dropdown__item--disabled">
        <span class="text-muted">Error loading domains</span>
      </div>
    `;
  }
}

/**
 * Handle attach domain button click
 */
async function handleAttachDomain(): Promise<void> {
  const { accountId } = getAuthState();
  if (!accountId || !currentSiteId) return;

  const selectBtn = document.querySelector<HTMLButtonElement>('[data-attach-domain-select]');
  const selectedDomainId = selectBtn?.getAttribute('data-selected-value');

  if (!selectedDomainId) {
    showGlobalMessage('warning', 'Please select a domain');
    return;
  }

  const statusPanel = document.querySelector<HTMLElement>('[data-site-domains-status]');
  const attachBtn = document.querySelector<HTMLButtonElement>('[data-site-attach-domain]');

  try {
    if (attachBtn) attachBtn.disabled = true;
    if (statusPanel) {
      statusPanel.className = 'panel';
      statusPanel.textContent = 'Attaching domain...';
      statusPanel.removeAttribute('hidden');
    }

    await attachDomain(currentSiteId, Number(selectedDomainId));

    if (statusPanel) {
      statusPanel.className = 'panel panel--success';
      statusPanel.textContent = t('sites.messages.domainAttached');
    }

    // Reload both lists
    await loadAttachedDomains(accountId, currentSiteId);
    if (currentProjectId) await loadAvailableDomains(accountId, currentProjectId);

    // Reset dropdown
    if (selectBtn) {
      selectBtn.setAttribute('data-selected-value', '');
      const label = selectBtn.querySelector('[data-selected-label]');
      if (label) label.textContent = t('sites.domains.selectDomainPlaceholder');
    }

    showGlobalMessage('success', t('sites.messages.domainAttached'));

    setTimeout(() => {
      if (statusPanel) statusPanel.setAttribute('hidden', '');
    }, 3000);
  } catch (error) {
    logError('Failed to attach domain:', error);
    if (statusPanel) {
      statusPanel.className = 'panel panel--error';
      statusPanel.textContent = 'Failed to attach domain';
      statusPanel.removeAttribute('hidden');
    }
    showGlobalMessage('error', 'Failed to attach domain');
  } finally {
    if (attachBtn) attachBtn.disabled = false;
  }
}

/**
 * Handle detach domain button click
 */
async function handleDetachDomain(domainId: number): Promise<void> {
  const { accountId } = getAuthState();
  if (!accountId || !currentSiteId) return;

  if (!confirm('Detach this domain from the site?')) {
    return;
  }

  try {
    await detachDomain(currentSiteId, domainId);
    showGlobalMessage('success', t('sites.messages.domainDetached'));

    // Reload both lists
    await loadAttachedDomains(accountId, currentSiteId);
    if (currentProjectId) await loadAvailableDomains(accountId, currentProjectId);
  } catch (error) {
    logError('Failed to detach domain:', error);
    showGlobalMessage('error', 'Failed to detach domain');
  }
}

/**
 * Initialize site domains management
 */
export function initSiteDomains(): void {
  // Drawer close buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const closeBtn = target.closest('[data-drawer="manage-site-domains"] [data-drawer-close]');
    if (closeBtn) {
      closeManageSiteDomainsDrawer();
    }

    // Manage domains action
    const manageBtn = target.closest('[data-action="manage-domains"]');
    if (manageBtn) {
      e.preventDefault();
      const siteId = manageBtn.getAttribute('data-site-id');
      if (siteId) openManageSiteDomainsDrawer(Number(siteId));
    }

    // Attach domain button
    const attachBtn = target.closest('[data-site-attach-domain]');
    if (attachBtn) {
      e.preventDefault();
      handleAttachDomain();
    }

    // Detach domain button
    const detachBtn = target.closest('[data-action="detach-domain"]');
    if (detachBtn) {
      e.preventDefault();
      const domainId = detachBtn.getAttribute('data-domain-id');
      if (domainId) handleDetachDomain(Number(domainId));
    }

    // Dropdown option selection
    const dropdownItem = target.closest('[data-attach-domain-menu] [data-value]');
    if (dropdownItem) {
      const value = dropdownItem.getAttribute('data-value');
      const label = dropdownItem.textContent?.trim() || '';
      const selectBtn = document.querySelector<HTMLButtonElement>('[data-attach-domain-select]');
      const attachBtn = document.querySelector<HTMLButtonElement>('[data-site-attach-domain]');

      if (selectBtn && value) {
        selectBtn.setAttribute('data-selected-value', value);
        const labelEl = selectBtn.querySelector('[data-selected-label]');
        if (labelEl) labelEl.textContent = label;

        // Enable attach button
        if (attachBtn) attachBtn.disabled = false;
      }
    }
  });
}
