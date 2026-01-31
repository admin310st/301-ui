/**
 * Project & Site Selectors for Redirects page
 *
 * Two-level selection:
 * 1. Project selector (single-select) - selects working project
 * 2. Site selector (multi-select) - filters which sites to show within project
 *
 * When project changes, all sites are selected by default.
 * User can then toggle individual sites on/off.
 */

import { safeCall } from '@api/ui-client';
import { getProjects } from '@api/projects';
import { getProjectSites } from '@api/sites';
import type { Site, Project } from '@api/types';
import { loadSitesRedirects, clearState, finishLoading, type SiteContext } from './state';
import { getSelectedProjectId, setSelectedProject } from '@state/ui-preferences';

// =============================================================================
// Types
// =============================================================================

interface ProjectOption {
  id: number;
  name: string;
}

interface SiteOption {
  id: number;
  name: string;
  tag: string | null;
  status: 'active' | 'paused' | 'archived';
  projectId: number;
  projectName: string;
  domainsCount: number;
}

// =============================================================================
// State
// =============================================================================

let availableProjects: ProjectOption[] = [];
let availableSites: SiteOption[] = [];
let currentProjectId: number | null = null;
let selectedSiteIds: Set<number> = new Set();
let onSitesChangeCallback: ((sites: SiteContext[]) => void) | null = null;

// =============================================================================
// API Loading
// =============================================================================

/**
 * Load all projects
 */
async function loadProjects(): Promise<ProjectOption[]> {
  try {
    const projects = await safeCall(
      () => getProjects(0),
      { lockKey: 'projects', retryOn401: true }
    );
    return projects.map((p: Project) => ({
      id: p.id,
      name: p.project_name,
    }));
  } catch (error) {
    console.error('[SiteSelector] Failed to load projects:', error);
    return [];
  }
}

/**
 * Load sites for a specific project
 */
async function loadProjectSites(projectId: number): Promise<SiteOption[]> {
  try {
    const project = availableProjects.find(p => p.id === projectId);
    const sites = await safeCall(
      () => getProjectSites(projectId),
      { lockKey: `redirects-sites-${projectId}`, retryOn401: true }
    );
    return sites.map((s: Site) => ({
      id: s.id,
      name: s.site_name,
      tag: s.site_tag,
      status: s.status,
      projectId: projectId,
      projectName: project?.name || '',
      domainsCount: s.domains_count,
    }));
  } catch (error) {
    console.error('[SiteSelector] Failed to load sites:', error);
    return [];
  }
}

// =============================================================================
// UI Rendering - Projects
// =============================================================================

/**
 * Render project options in dropdown
 */
function renderProjectOptions(container: HTMLElement): void {
  if (availableProjects.length === 0) {
    container.innerHTML = '<div class="dropdown__item text-muted">No projects</div>';
    return;
  }

  container.innerHTML = availableProjects.map(project => {
    const isSelected = project.id === currentProjectId;
    return `
      <button
        class="dropdown__item ${isSelected ? 'dropdown__item--selected' : ''}"
        type="button"
        data-action="select-project"
        data-project-id="${project.id}"
      >
        <span class="icon" data-icon="mono/layers"></span>
        <span>${project.name}</span>
      </button>
    `;
  }).join('');
}

/**
 * Update project name in selector button
 */
function updateProjectDisplay(name: string): void {
  const nameEl = document.querySelector('[data-project-name]');
  if (nameEl) nameEl.textContent = name;
}

// =============================================================================
// UI Rendering - Sites (multi-select)
// =============================================================================

/**
 * Render site options with checkboxes for multi-select
 */
function renderSiteOptions(container: HTMLElement): void {
  if (availableSites.length === 0) {
    container.innerHTML = '<div class="dropdown__item text-muted">No sites in project</div>';
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
      <span>${allSelected ? 'Deselect all' : 'Select all'}</span>
      <span class="badge badge--xs badge--neutral">${availableSites.length}</span>
    </button>
    <div class="dropdown__divider"></div>
  `;

  for (const site of availableSites) {
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
        <span>${site.name}</span>
        <span class="badge badge--xs badge--neutral">${site.domainsCount}</span>
      </button>
    `;
  }

  container.innerHTML = html;

  // Set indeterminate state
  const toggleAllCheckbox = container.querySelector('[data-action="toggle-all-sites"] input');
  if (toggleAllCheckbox && someSelected) {
    (toggleAllCheckbox as HTMLInputElement).indeterminate = true;
  }
}

/**
 * Update sites display in selector button
 */
function updateSitesDisplay(): void {
  const nameEl = document.querySelector('[data-site-name]');
  if (!nameEl) return;

  if (selectedSiteIds.size === 0) {
    nameEl.textContent = 'No sites';
  } else if (selectedSiteIds.size === availableSites.length) {
    nameEl.textContent = `All sites (${availableSites.length})`;
  } else if (selectedSiteIds.size === 1) {
    const site = availableSites.find(s => selectedSiteIds.has(s.id));
    nameEl.textContent = site?.name || 'Sites';
  } else {
    nameEl.textContent = `${selectedSiteIds.size} sites`;
  }
}

// =============================================================================
// Data Loading
// =============================================================================

/**
 * Load redirects for all selected sites
 */
async function loadSelectedSitesRedirects(): Promise<void> {
  if (selectedSiteIds.size === 0) {
    clearState();
    return;
  }

  const siteContexts: SiteContext[] = availableSites
    .filter(s => selectedSiteIds.has(s.id))
    .map(s => ({
      siteId: s.id,
      siteName: s.name,
      siteTag: s.tag,
      siteStatus: s.status,
      projectId: s.projectId,
      projectName: s.projectName,
    }));

  await loadSitesRedirects(siteContexts);

  if (onSitesChangeCallback) {
    onSitesChangeCallback(siteContexts);
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle project selection
 */
async function handleProjectSelect(projectId: number): Promise<void> {
  if (projectId === currentProjectId) return;

  currentProjectId = projectId;
  const project = availableProjects.find(p => p.id === projectId);
  if (project) {
    updateProjectDisplay(project.name);
    // Persist project selection across pages
    setSelectedProject({ id: project.id, name: project.name });
  }

  // Close project dropdown
  closeDropdown('[data-project-selector]');

  // Update project options
  const projectOptions = document.querySelector('[data-project-options]');
  if (projectOptions) renderProjectOptions(projectOptions as HTMLElement);

  // Load sites for this project
  availableSites = await loadProjectSites(projectId);

  // Select all sites by default
  selectedSiteIds = new Set(availableSites.map(s => s.id));

  // Update sites dropdown
  const siteOptions = document.querySelector('[data-site-options]');
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateSitesDisplay();

  // Load redirects
  await loadSelectedSitesRedirects();
}

/**
 * Handle site toggle (multi-select)
 */
async function handleSiteToggle(siteId: number): Promise<void> {
  if (selectedSiteIds.has(siteId)) {
    selectedSiteIds.delete(siteId);
  } else {
    selectedSiteIds.add(siteId);
  }

  // Update UI
  const siteOptions = document.querySelector('[data-site-options]');
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateSitesDisplay();

  // Load redirects
  await loadSelectedSitesRedirects();
}

/**
 * Handle toggle all sites
 */
async function handleToggleAllSites(): Promise<void> {
  if (selectedSiteIds.size === availableSites.length) {
    // Deselect all
    selectedSiteIds.clear();
  } else {
    // Select all
    selectedSiteIds = new Set(availableSites.map(s => s.id));
  }

  // Update UI
  const siteOptions = document.querySelector('[data-site-options]');
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateSitesDisplay();

  // Load redirects
  await loadSelectedSitesRedirects();
}

/**
 * Close a dropdown by selector
 */
function closeDropdown(selector: string): void {
  const dropdown = document.querySelector(selector);
  if (dropdown) {
    dropdown.classList.remove('dropdown--open');
    const trigger = dropdown.querySelector('.dropdown__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Setup dropdown toggle behavior
 */
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
 * Initialize project & site selectors
 */
export async function initSiteSelector(
  onSitesChange?: (sites: SiteContext[]) => void
): Promise<void> {
  onSitesChangeCallback = onSitesChange ?? null;

  const projectSelector = document.querySelector('[data-project-selector]');
  const projectOptions = document.querySelector('[data-project-options]');
  const siteSelector = document.querySelector('[data-site-selector]');
  const siteOptions = document.querySelector('[data-site-options]');

  // Show loading
  if (projectOptions) {
    projectOptions.innerHTML = '<div class="dropdown__item text-muted">Loading...</div>';
  }
  if (siteOptions) {
    siteOptions.innerHTML = '<div class="dropdown__item text-muted">Select project first</div>';
  }

  // Load projects
  availableProjects = await loadProjects();

  // Render project options
  if (projectOptions) {
    renderProjectOptions(projectOptions as HTMLElement);
  }

  // Setup project dropdown
  if (projectSelector) {
    setupDropdownToggle('[data-project-selector]');

    projectOptions?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-action="select-project"]') as HTMLElement;
      if (button) {
        const projectId = Number(button.dataset.projectId);
        handleProjectSelect(projectId);
      }
    });
  }

  // Setup site dropdown (multi-select)
  if (siteSelector) {
    setupDropdownToggle('[data-site-selector]');

    siteOptions?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Toggle all
      if (target.closest('[data-action="toggle-all-sites"]')) {
        e.preventDefault();
        handleToggleAllSites();
        return;
      }

      // Toggle single site
      const siteButton = target.closest('[data-action="toggle-site"]') as HTMLElement;
      if (siteButton) {
        e.preventDefault();
        const siteId = Number(siteButton.dataset.siteId);
        handleSiteToggle(siteId);
      }
    });
  }

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-project-selector]')) {
      closeDropdown('[data-project-selector]');
    }
    if (!target.closest('[data-site-selector]')) {
      closeDropdown('[data-site-selector]');
    }
  });

  // Auto-select saved project or first project or finish loading if none
  if (availableProjects.length > 0) {
    const savedProjectId = getSelectedProjectId();
    const projectToSelect = savedProjectId
      ? availableProjects.find(p => p.id === savedProjectId)
      : null;

    // Use saved project if found, otherwise fall back to first project
    await handleProjectSelect(projectToSelect?.id ?? availableProjects[0].id);
  } else {
    // No projects available - finish loading to show empty state
    finishLoading();
  }
}

/**
 * Get currently selected project ID
 */
export function getCurrentProjectId(): number | null {
  return currentProjectId;
}

/**
 * Get currently selected site IDs
 */
export function getSelectedSiteIds(): number[] {
  return Array.from(selectedSiteIds);
}

/**
 * Get available sites for current project
 */
export function getAvailableSites(): SiteOption[] {
  return availableSites;
}
