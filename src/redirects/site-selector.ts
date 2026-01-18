/**
 * Site Selector for Redirects page
 *
 * Loads available sites and handles site switching.
 * When a site is selected, triggers redirect loading via state.
 */

import { safeCall } from '@api/ui-client';
import { getProjects } from '@api/projects';
import { getProjectSites } from '@api/sites';
import type { Site, Project } from '@api/types';
import { loadSiteRedirects, clearState } from './state';

// =============================================================================
// State
// =============================================================================

interface SiteOption {
  id: number;
  name: string;
  projectId: number;
  projectName: string;
  domainsCount: number;
}

let availableSites: SiteOption[] = [];
let currentSiteId: number | null = null;
let onSiteChangeCallback: ((siteId: number) => void) | null = null;

// =============================================================================
// API Loading
// =============================================================================

/**
 * Load all sites from all projects
 */
async function loadAllSites(): Promise<SiteOption[]> {
  try {
    // Get all projects first
    const projects = await safeCall(
      () => getProjects(0), // accountId 0 for current user
      { lockKey: 'projects-list', retryOn401: true }
    );

    // Load sites for each project in parallel
    const sitesPromises = projects.map(async (project: Project) => {
      try {
        const sites = await safeCall(
          () => getProjectSites(project.id),
          { lockKey: `sites-project-${project.id}`, retryOn401: true }
        );
        return sites.map((site: Site) => ({
          id: site.id,
          name: site.site_name,
          projectId: project.id,
          projectName: project.project_name,
          domainsCount: site.domains_count,
        }));
      } catch {
        return [];
      }
    });

    const sitesArrays = await Promise.all(sitesPromises);
    return sitesArrays.flat();
  } catch (error) {
    console.error('[SiteSelector] Failed to load sites:', error);
    return [];
  }
}

// =============================================================================
// UI Rendering
// =============================================================================

/**
 * Render site options in dropdown
 */
function renderSiteOptions(container: HTMLElement): void {
  if (availableSites.length === 0) {
    container.innerHTML = `
      <div class="dropdown__item text-muted">No sites available</div>
    `;
    return;
  }

  // Group by project
  const byProject = new Map<string, SiteOption[]>();
  for (const site of availableSites) {
    if (!byProject.has(site.projectName)) {
      byProject.set(site.projectName, []);
    }
    byProject.get(site.projectName)!.push(site);
  }

  let html = '';
  let isFirst = true;

  for (const [projectName, sites] of byProject) {
    if (!isFirst) {
      html += '<div class="dropdown__divider"></div>';
    }
    isFirst = false;

    html += `<div class="dropdown__label">${projectName}</div>`;

    for (const site of sites) {
      const isSelected = site.id === currentSiteId;
      html += `
        <button
          class="dropdown__item ${isSelected ? 'dropdown__item--selected' : ''}"
          type="button"
          data-action="select-site"
          data-site-id="${site.id}"
          data-site-name="${site.name}"
        >
          <span>${site.name}</span>
          <span class="badge badge--xs badge--neutral">${site.domainsCount}</span>
        </button>
      `;
    }
  }

  container.innerHTML = html;
}

/**
 * Update site name display in filter chip
 */
function updateSiteNameDisplay(name: string): void {
  const nameEl = document.querySelector('[data-site-name]');
  if (nameEl) {
    nameEl.textContent = name;
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle site selection
 */
async function handleSiteSelect(siteId: number): Promise<void> {
  if (siteId === currentSiteId) return;

  // Find site info from available sites
  const site = availableSites.find(s => s.id === siteId);
  if (!site) return;

  currentSiteId = siteId;
  updateSiteNameDisplay(site.name);

  // Close dropdown
  const dropdown = document.querySelector('[data-site-selector]');
  if (dropdown) {
    dropdown.classList.remove('dropdown--open');
    const trigger = dropdown.querySelector('.dropdown__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  // Update selected state in options
  const optionsContainer = document.querySelector('[data-site-options]');
  if (optionsContainer) {
    renderSiteOptions(optionsContainer as HTMLElement);
  }

  // Load redirects for selected site (with full context)
  await loadSiteRedirects({
    siteId: site.id,
    siteName: site.name,
    projectId: site.projectId,
    projectName: site.projectName,
  });

  // Notify callback
  if (onSiteChangeCallback) {
    onSiteChangeCallback(siteId);
  }
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize site selector
 * @param onSiteChange Callback when site is changed
 */
export async function initSiteSelector(
  onSiteChange?: (siteId: number) => void
): Promise<void> {
  onSiteChangeCallback = onSiteChange ?? null;

  const selectorDropdown = document.querySelector('[data-site-selector]');
  const optionsContainer = document.querySelector('[data-site-options]');

  if (!selectorDropdown || !optionsContainer) {
    console.warn('[SiteSelector] Elements not found');
    return;
  }

  // Show loading state
  optionsContainer.innerHTML = '<div class="dropdown__item text-muted">Loading sites...</div>';

  // Load sites
  availableSites = await loadAllSites();

  // Render options
  renderSiteOptions(optionsContainer as HTMLElement);

  // Setup dropdown toggle
  const trigger = selectorDropdown.querySelector('.dropdown__trigger');
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = selectorDropdown.classList.contains('dropdown--open');

      // Close all other dropdowns
      document.querySelectorAll('.dropdown--open').forEach((other) => {
        if (other !== selectorDropdown) {
          other.classList.remove('dropdown--open');
          const otherTrigger = other.querySelector('.dropdown__trigger');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        }
      });

      if (isOpen) {
        selectorDropdown.classList.remove('dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        selectorDropdown.classList.add('dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // Setup site selection via delegation
  optionsContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action="select-site"]') as HTMLElement;
    if (!button) return;

    const siteId = Number(button.dataset.siteId);
    handleSiteSelect(siteId);
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-site-selector]')) {
      selectorDropdown.classList.remove('dropdown--open');
      const trigger = selectorDropdown.querySelector('.dropdown__trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });

  // Auto-select first site if available
  if (availableSites.length > 0) {
    const firstSite = availableSites[0];
    await handleSiteSelect(firstSite.id);
  }
}

/**
 * Get currently selected site ID
 */
export function getCurrentSiteId(): number | null {
  return currentSiteId;
}

/**
 * Get available sites
 */
export function getAvailableSites(): SiteOption[] {
  return availableSites;
}
