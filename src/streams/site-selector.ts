/**
 * Site Selector for TDS/Streams page
 *
 * Single-select: pick one site → table shows rules for that site.
 * TDS rules are site-scoped, so you always work with one site at a time.
 * Loads all sites across all projects into a flat list.
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
let currentSiteId: number | null = null;
let onChangeCallback: ((siteIds: number[]) => void) | null = null;

// =============================================================================
// API Loading
// =============================================================================

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

  const showHeaders = byProject.size > 1;
  let html = '';

  for (const [, group] of byProject) {
    if (showHeaders) {
      html += `<div class="dropdown__item text-muted text-sm" style="pointer-events:none;opacity:.6">${escapeHtml(group.name)}</div>`;
    }

    for (const site of group.sites) {
      const isSelected = site.id === currentSiteId;
      html += `
        <button
          class="dropdown__item${isSelected ? ' dropdown__item--selected' : ''}"
          type="button"
          data-action="select-site"
          data-site-id="${site.id}"
        >
          <span>${escapeHtml(site.name)}</span>
        </button>
      `;
    }
  }

  container.innerHTML = html;
}

function updateDisplay(): void {
  const nameEl = document.querySelector('[data-site-name]');
  if (!nameEl) return;

  if (currentSiteId === null) {
    nameEl.textContent = t('streams.selectors.sites');
  } else {
    const site = availableSites.find(s => s.id === currentSiteId);
    nameEl.textContent = site?.name || t('streams.selectors.sites');
  }
}

function notifyChange(): void {
  if (onChangeCallback) {
    onChangeCallback(currentSiteId !== null ? [currentSiteId] : []);
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

function handleSiteSelect(siteId: number): void {
  if (siteId === currentSiteId) return;

  currentSiteId = siteId;

  closeDropdown('[data-site-selector]');

  const siteOptions = document.querySelector('[data-site-options]');
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateDisplay();

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
 * @param onChange Called with selected site IDs (0 or 1 element) whenever selection changes
 */
export async function initTdsSiteSelector(
  onChange: (siteIds: number[]) => void
): Promise<void> {
  onChangeCallback = onChange;

  const siteOptions = document.querySelector('[data-site-options]');

  if (siteOptions) {
    siteOptions.innerHTML = `<div class="dropdown__item text-muted">${t('common.pleaseWait')}</div>`;
  }

  availableSites = await loadAllSites();

  // Determine initial selection
  const pendingSiteId = consumePendingTdsSiteId();

  if (pendingSiteId !== null && availableSites.find(s => s.id === pendingSiteId)) {
    currentSiteId = pendingSiteId;
  } else if (availableSites.length > 0) {
    currentSiteId = availableSites[0].id;
  }

  // Render
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateDisplay();

  // Setup dropdown
  setupDropdownToggle('[data-site-selector]');
  siteOptions?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action="select-site"]') as HTMLElement;
    if (button) {
      const siteId = Number(button.dataset.siteId);
      handleSiteSelect(siteId);
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-site-selector]')) {
      closeDropdown('[data-site-selector]');
    }
  });

  notifyChange();
}

/**
 * Get currently selected site IDs (0 or 1 element)
 */
export function getSelectedSiteIds(): number[] {
  return currentSiteId !== null ? [currentSiteId] : [];
}

/**
 * Get all available sites
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
