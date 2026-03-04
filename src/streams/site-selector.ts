/**
 * Site Selector for TDS/Streams page
 *
 * Single flat selector listing all sites across all projects.
 * TDS rules are site-scoped — no need for a project-level filter.
 * API returns all account rules; page filters client-side by selected sites.
 */

import { safeCall } from '@api/ui-client';
import { getProjects } from '@api/projects';
import { getProjectSites } from '@api/sites';
import type { Site, Project } from '@api/types';
import { consumePendingTdsSiteId } from '@state/ui-preferences';
import { t } from '@i18n';

// =============================================================================
// Types
// =============================================================================

export interface SiteOption {
  id: number;
  name: string;
  tag: string | null;
  status: 'active' | 'paused' | 'archived';
  projectId: number;
  projectName: string;
}

// =============================================================================
// State
// =============================================================================

let availableSites: SiteOption[] = [];
let selectedSiteIds: Set<number> = new Set();
let onChangeCallback: ((siteIds: number[]) => void) | null = null;

// =============================================================================
// API Loading
// =============================================================================

/**
 * Load all sites from all projects
 */
async function loadAllSites(): Promise<SiteOption[]> {
  try {
    const projects = await safeCall(
      () => getProjects(0),
      { lockKey: 'tds-projects', retryOn401: true }
    );

    const sitePromises = projects.map(async (p: Project) => {
      try {
        const sites = await safeCall(
          () => getProjectSites(p.id),
          { lockKey: `tds-sites-${p.id}`, retryOn401: true }
        );
        return sites.map((s: Site) => ({
          id: s.id,
          name: s.site_name,
          tag: s.site_tag,
          status: s.status,
          projectId: p.id,
          projectName: p.project_name,
        }));
      } catch {
        return [];
      }
    });

    const siteArrays = await Promise.all(sitePromises);
    return siteArrays.flat();
  } catch (error) {
    console.error('[TdsSiteSelector] Failed to load sites:', error);
    return [];
  }
}

// =============================================================================
// UI Rendering
// =============================================================================

function renderSiteOptions(container: HTMLElement): void {
  if (availableSites.length === 0) {
    container.innerHTML = `<div class="dropdown__item text-muted">${t('streams.selectors.noSites')}</div>`;
    return;
  }

  const allSelected = selectedSiteIds.size === availableSites.length;
  const someSelected = selectedSiteIds.size > 0 && selectedSiteIds.size < availableSites.length;

  let html = `
    <button
      class="dropdown__item"
      type="button"
      data-action="toggle-all-sites"
    >
      <input
        type="checkbox"
        class="checkbox"
        ${allSelected ? 'checked' : ''}
        ${someSelected ? 'data-indeterminate="true"' : ''}
        tabindex="-1"
      />
      <span>${allSelected ? t('streams.selectors.deselectAll') : t('streams.selectors.selectAll')}</span>
      <span class="badge badge--xs badge--neutral">${availableSites.length}</span>
    </button>
    <div class="dropdown__divider"></div>
  `;

  // Group sites by project
  const byProject = new Map<number, { name: string; sites: SiteOption[] }>();
  for (const site of availableSites) {
    let group = byProject.get(site.projectId);
    if (!group) {
      group = { name: site.projectName, sites: [] };
      byProject.set(site.projectId, group);
    }
    group.sites.push(site);
  }

  // If only one project, skip project headers
  const showHeaders = byProject.size > 1;

  for (const [, group] of byProject) {
    if (showHeaders) {
      html += `<div class="dropdown__item text-muted text-sm" style="pointer-events:none;opacity:.6">${escapeHtml(group.name)}</div>`;
    }

    for (const site of group.sites) {
      const isSelected = selectedSiteIds.has(site.id);
      html += `
        <button
          class="dropdown__item"
          type="button"
          data-action="toggle-site"
          data-site-id="${site.id}"
        >
          <input
            type="checkbox"
            class="checkbox"
            ${isSelected ? 'checked' : ''}
            tabindex="-1"
          />
          <span>${escapeHtml(site.name)}</span>
        </button>
      `;
    }
  }

  container.innerHTML = html;

  // Set indeterminate state
  const toggleAllCheckbox = container.querySelector('[data-action="toggle-all-sites"] input');
  if (toggleAllCheckbox && someSelected) {
    (toggleAllCheckbox as HTMLInputElement).indeterminate = true;
  }
}

function updateSitesDisplay(): void {
  const nameEl = document.querySelector('[data-site-name]');
  if (!nameEl) return;

  if (selectedSiteIds.size === 0) {
    nameEl.textContent = t('streams.selectors.sites');
  } else if (selectedSiteIds.size === availableSites.length) {
    nameEl.textContent = `${t('streams.selectors.allSites')} (${availableSites.length})`;
  } else if (selectedSiteIds.size === 1) {
    const site = availableSites.find(s => selectedSiteIds.has(s.id));
    nameEl.textContent = site?.name || t('streams.selectors.sites');
  } else {
    nameEl.textContent = `${selectedSiteIds.size} ${t('streams.selectors.sites').toLowerCase()}`;
  }
}

function notifyChange(): void {
  if (onChangeCallback) {
    onChangeCallback(Array.from(selectedSiteIds));
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

function handleSiteToggle(siteId: number): void {
  if (selectedSiteIds.has(siteId)) {
    selectedSiteIds.delete(siteId);
  } else {
    selectedSiteIds.add(siteId);
  }

  const siteOptions = document.querySelector('[data-site-options]');
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateSitesDisplay();

  notifyChange();
}

function handleToggleAllSites(): void {
  if (selectedSiteIds.size === availableSites.length) {
    selectedSiteIds.clear();
  } else {
    selectedSiteIds = new Set(availableSites.map(s => s.id));
  }

  const siteOptions = document.querySelector('[data-site-options]');
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateSitesDisplay();

  notifyChange();
}

// =============================================================================
// Dropdown Helpers
// =============================================================================

function closeDropdown(selector: string): void {
  const dropdown = document.querySelector(selector);
  if (dropdown) {
    dropdown.classList.remove('dropdown--open');
    const trigger = dropdown.querySelector('.dropdown__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }
}

function setupDropdownToggle(selector: string): void {
  const dropdown = document.querySelector(selector);
  if (!dropdown) return;

  const trigger = dropdown.querySelector('.dropdown__trigger');
  if (!trigger) return;

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = dropdown.classList.contains('dropdown--open');

    // Close all other dropdowns
    document.querySelectorAll('.dropdown--open').forEach(other => {
      if (other !== dropdown) {
        other.classList.remove('dropdown--open');
        other.querySelector('.dropdown__trigger')?.setAttribute('aria-expanded', 'false');
      }
    });

    if (isOpen) {
      dropdown.classList.remove('dropdown--open');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      dropdown.classList.add('dropdown--open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize site selector for TDS page
 * @param onChange Called with selected site IDs whenever selection changes
 */
export async function initTdsSiteSelector(
  onChange: (siteIds: number[]) => void
): Promise<void> {
  onChangeCallback = onChange;

  const siteOptions = document.querySelector('[data-site-options]');

  // Show loading
  if (siteOptions) {
    siteOptions.innerHTML = `<div class="dropdown__item text-muted">${t('common.pleaseWait')}</div>`;
  }

  // Load all sites across all projects
  availableSites = await loadAllSites();

  // Check for pending cross-page navigation (e.g. from redirects "TDS Rules" action)
  const pendingSiteId = consumePendingTdsSiteId();

  if (pendingSiteId !== null) {
    const targetSite = availableSites.find(s => s.id === pendingSiteId);
    if (targetSite) {
      selectedSiteIds = new Set([targetSite.id]);
    } else {
      selectedSiteIds = new Set(availableSites.map(s => s.id));
    }
  } else {
    // Select all sites by default
    selectedSiteIds = new Set(availableSites.map(s => s.id));
  }

  // Render
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateSitesDisplay();

  // Setup dropdown toggle
  setupDropdownToggle('[data-site-selector]');
  siteOptions?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    if (target.closest('[data-action="toggle-all-sites"]')) {
      e.preventDefault();
      handleToggleAllSites();
      return;
    }

    const siteButton = target.closest('[data-action="toggle-site"]') as HTMLElement;
    if (siteButton) {
      e.preventDefault();
      const siteId = Number(siteButton.dataset.siteId);
      handleSiteToggle(siteId);
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-site-selector]')) {
      closeDropdown('[data-site-selector]');
    }
  });

  // Notify page controller
  notifyChange();
}

/**
 * Get currently selected site IDs
 */
export function getSelectedSiteIds(): number[] {
  return Array.from(selectedSiteIds);
}

/**
 * Get available sites (all loaded sites)
 */
export function getAvailableSites(): SiteOption[] {
  return availableSites;
}

// =============================================================================
// Utility
// =============================================================================

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
