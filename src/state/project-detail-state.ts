/**
 * Minimal state management for Project Detail view
 * Enables point updates without full reload
 */

import type { Project, Site, ProjectIntegration } from '@api/types';

interface ProjectDetailState {
  projectId: number | null;
  project: Project | null;
  sites: Site[];
  integrations: ProjectIntegration[];
  requestToken: number;
}

let state: ProjectDetailState = {
  projectId: null,
  project: null,
  sites: [],
  integrations: [],
  requestToken: 0,
};

// ============================================================================
// Getters
// ============================================================================

export function getCurrentProjectId(): number | null {
  return state.projectId;
}

export function getCurrentProject(): Project | null {
  return state.project;
}

export function getCurrentSites(): Site[] {
  return state.sites;
}

export function getCurrentIntegrations(): ProjectIntegration[] {
  return state.integrations;
}

export function getRequestToken(): number {
  return state.requestToken;
}

// ============================================================================
// Full Load (from loadProjectDetail)
// ============================================================================

export function setProjectData(
  projectId: number,
  data: { project: Project; sites: Site[]; integrations: ProjectIntegration[] }
): void {
  state = {
    projectId,
    project: data.project,
    sites: data.sites,
    integrations: data.integrations,
    requestToken: state.requestToken, // НЕ инкрементируем здесь
  };
}

export function clearProjectData(): void {
  state = {
    projectId: null,
    project: null,
    sites: [],
    integrations: [],
    requestToken: state.requestToken, // НЕ инкрементируем здесь
  };
}

// ============================================================================
// Partial Setters (для PR #2/#3)
// ============================================================================

/**
 * Replace entire sites array (after getSites or manage domains fallback)
 */
export function setSites(sites: Site[]): void {
  if (state.projectId === null) {
    console.debug('[project-detail-state] setSites: no active project');
    return;
  }
  state.sites = sites;
}

/**
 * Replace entire integrations array (after getProjectIntegrations)
 */
export function setIntegrations(integrations: ProjectIntegration[]): void {
  if (state.projectId === null) {
    console.debug('[project-detail-state] setIntegrations: no active project');
    return;
  }
  state.integrations = integrations;
}

// ============================================================================
// Point Updates - Sites
// ============================================================================

export function updateSite(siteId: number, updates: Partial<Site>): void {
  if (state.projectId === null) {
    console.debug('[project-detail-state] updateSite: no active project');
    return;
  }

  state.sites = state.sites.map(site =>
    site.id === siteId ? { ...site, ...updates } : site
  );
}

export function addSite(site: Site): void {
  if (state.projectId === null) {
    console.debug('[project-detail-state] addSite: no active project');
    return;
  }

  // Validate project_id if available
  if (site.project_id && site.project_id !== state.projectId) {
    console.debug('[project-detail-state] addSite: site belongs to different project', {
      siteProjectId: site.project_id,
      currentProjectId: state.projectId,
    });
    return;
  }

  state.sites = [...state.sites, site];
}

export function removeSite(siteId: number): void {
  if (state.projectId === null) {
    console.debug('[project-detail-state] removeSite: no active project');
    return;
  }

  state.sites = state.sites.filter(site => site.id !== siteId);
}

// ============================================================================
// Point Updates - Integrations
// ============================================================================

export function addIntegration(integration: ProjectIntegration): void {
  if (state.projectId === null) {
    console.debug('[project-detail-state] addIntegration: no active project');
    return;
  }

  // Prevent duplicates by id
  const exists = state.integrations.some(i => i.id === integration.id);
  if (exists) {
    console.debug('[project-detail-state] addIntegration: already exists', { id: integration.id });
    return;
  }

  state.integrations = [...state.integrations, integration];
}

export function removeIntegration(integrationId: number): void {
  if (state.projectId === null) {
    console.debug('[project-detail-state] removeIntegration: no active project');
    return;
  }

  state.integrations = state.integrations.filter(i => i.id !== integrationId);
}

// ============================================================================
// Request Token (for abort)
// ============================================================================

export function incrementRequestToken(): number {
  state.requestToken += 1; // ЕДИНСТВЕННОЕ место инкремента
  return state.requestToken;
}
