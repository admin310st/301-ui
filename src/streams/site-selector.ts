/**
 * Project & Site Selectors for TDS/Streams page
 *
 * Two-level selection:
 * 1. Project selector (single-select) - selects working project
 * 2. Site selector (multi-select) - filters which sites to show within project
 *
 * Unlike redirects, TDS loads ALL rules in one API call and filters client-side
 * by site_id. No per-site data loading needed.
 */

import { safeCall } from '@api/ui-client';
import { getProjects } from '@api/projects';
import { getProjectSites } from '@api/sites';
import type { Site, Project } from '@api/types';
import { getSelectedProjectId, setSelectedProject } from '@state/ui-preferences';
import { t } from '@i18n';

// =============================================================================
// Types
// =============================================================================

interface ProjectOption {
  id: number;
  name: string;
}

export interface SiteOption {
  id: number;
  name: string;
  tag: string | null;
  status: 'active' | 'paused' | 'archived';
}

// =============================================================================
// State
// =============================================================================

let availableProjects: ProjectOption[] = [];
let availableSites: SiteOption[] = [];
let currentProjectId: number | null = null;
let selectedSiteIds: Set<number> = new Set();
let onChangeCallback: ((siteIds: number[]) => void) | null = null;

// =============================================================================
// API Loading
// =============================================================================

async function loadProjects(): Promise<ProjectOption[]> {
  try {
    const projects = await safeCall(
      () => getProjects(0),
      { lockKey: 'tds-projects', retryOn401: true }
    );
    return projects.map((p: Project) => ({
      id: p.id,
      name: p.project_name,
    }));
  } catch (error) {
    console.error('[TdsSiteSelector] Failed to load projects:', error);
    return [];
  }
}

async function loadProjectSites(projectId: number): Promise<SiteOption[]> {
  try {
    const sites = await safeCall(
      () => getProjectSites(projectId),
      { lockKey: `tds-sites-${projectId}`, retryOn401: true }
    );
    return sites.map((s: Site) => ({
      id: s.id,
      name: s.site_name,
      tag: s.site_tag,
      status: s.status,
    }));
  } catch (error) {
    console.error('[TdsSiteSelector] Failed to load sites:', error);
    return [];
  }
}

// =============================================================================
// UI Rendering - Projects
// =============================================================================

function renderProjectOptions(container: HTMLElement): void {
  if (availableProjects.length === 0) {
    container.innerHTML = `<div class="dropdown__item text-muted">${t('streams.selectors.noProjects')}</div>`;
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
        <span>${escapeHtml(project.name)}</span>
      </button>
    `;
  }).join('');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '\u2026';
}

function updateProjectDisplay(name: string): void {
  const nameEl = document.querySelector('[data-project-name]');
  if (nameEl) {
    nameEl.textContent = truncateText(name, 20);
    if (name.length > 20) {
      nameEl.setAttribute('title', name);
    } else {
      nameEl.removeAttribute('title');
    }
  }
}

// =============================================================================
// UI Rendering - Sites (multi-select)
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
        <span>${escapeHtml(site.name)}</span>
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

async function handleProjectSelect(projectId: number): Promise<void> {
  if (projectId === currentProjectId) return;

  currentProjectId = projectId;
  const project = availableProjects.find(p => p.id === projectId);
  if (project) {
    updateProjectDisplay(project.name);
    setSelectedProject({ id: project.id, name: project.name });
  }

  closeDropdown('[data-project-selector]');

  const projectOptions = document.querySelector('[data-project-options]');
  if (projectOptions) renderProjectOptions(projectOptions as HTMLElement);

  // Load sites for this project
  availableSites = await loadProjectSites(projectId);

  // Select all sites by default
  selectedSiteIds = new Set(availableSites.map(s => s.id));

  const siteOptions = document.querySelector('[data-site-options]');
  if (siteOptions) renderSiteOptions(siteOptions as HTMLElement);
  updateSitesDisplay();

  notifyChange();
}

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
 * Initialize project & site selectors for TDS page
 * @param onChange Called with selected site IDs whenever selection changes
 */
export async function initTdsSiteSelector(
  onChange: (siteIds: number[]) => void
): Promise<void> {
  onChangeCallback = onChange;

  const projectOptions = document.querySelector('[data-project-options]');
  const siteOptions = document.querySelector('[data-site-options]');

  // Show loading
  if (projectOptions) {
    projectOptions.innerHTML = `<div class="dropdown__item text-muted">${t('common.pleaseWait')}</div>`;
  }
  if (siteOptions) {
    siteOptions.innerHTML = `<div class="dropdown__item text-muted">${t('streams.selectors.selectProject')}</div>`;
  }

  // Load projects
  availableProjects = await loadProjects();

  if (projectOptions) {
    renderProjectOptions(projectOptions as HTMLElement);
  }

  // Setup project dropdown
  setupDropdownToggle('[data-project-selector]');
  projectOptions?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action="select-project"]') as HTMLElement;
    if (button) {
      const projectId = Number(button.dataset.projectId);
      void handleProjectSelect(projectId);
    }
  });

  // Setup site dropdown (multi-select)
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

  // Auto-select saved project or first project
  if (availableProjects.length > 0) {
    const savedProjectId = getSelectedProjectId();
    const projectToSelect = savedProjectId
      ? availableProjects.find(p => p.id === savedProjectId)
      : null;

    await handleProjectSelect(projectToSelect?.id ?? availableProjects[0].id);
  } else {
    // No projects — notify with empty selection
    notifyChange();
  }
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

// =============================================================================
// Utility
// =============================================================================

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
