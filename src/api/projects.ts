/**
 * API client for Projects
 * Base URL: https://api.301.st/projects
 */

import { apiFetch } from './client';
import { getCached, setCache, invalidateCacheByPrefix } from './cache';
import type {
  Project,
  ProjectIntegration,
  GetProjectsResponse,
  GetProjectResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  UpdateProjectRequest,
  GetProjectIntegrationsResponse,
  AttachIntegrationRequest,
  AttachIntegrationResponse,
} from './types';

const BASE_URL = '/projects';

/**
 * Get all projects for current account
 * @param accountId Account ID (from auth state)
 * @returns Array of projects
 */
export async function getProjects(accountId: number): Promise<Project[]> {
  // Check cache first (30 second TTL)
  const cacheKey = `projects:${accountId}`;
  const cached = getCached<Project[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const response = await apiFetch<GetProjectsResponse>(BASE_URL);

  // Store in cache
  setCache(cacheKey, response.projects);
  return response.projects;
}

/**
 * Get project details with sites and integrations
 * @param id Project ID
 * @returns Project details with sites and integrations
 */
export async function getProject(id: number): Promise<GetProjectResponse> {
  // Check cache first (30 second TTL)
  const cacheKey = `project:${id}`;
  const cached = getCached<GetProjectResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const response = await apiFetch<GetProjectResponse>(`${BASE_URL}/${id}`);

  // Store in cache
  setCache(cacheKey, response);
  return response;
}

/**
 * Create a new project (automatically creates first site)
 * @param data Project creation data
 * @returns Created project and site
 */
export async function createProject(data: CreateProjectRequest): Promise<CreateProjectResponse> {
  const response = await apiFetch<CreateProjectResponse>(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Invalidate projects cache
  invalidateCacheByPrefix('projects:');

  return response;
}

/**
 * Update project details
 * @param id Project ID
 * @param data Updated fields
 */
export async function updateProject(id: number, data: UpdateProjectRequest): Promise<void> {
  await apiFetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  // Invalidate project cache
  invalidateCacheByPrefix('project:');
  invalidateCacheByPrefix('projects:');
}

/**
 * Delete a project (cascade deletes sites and integrations)
 * @param id Project ID
 */
export async function deleteProject(id: number): Promise<void> {
  await apiFetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });

  // Invalidate all project-related caches
  invalidateCacheByPrefix('project:');
  invalidateCacheByPrefix('projects:');
  invalidateCacheByPrefix('sites:');
}

/**
 * Get integrations (attached keys) for a project
 * @param id Project ID
 * @param provider Optional provider filter (cloudflare, namecheap)
 * @returns Array of project integrations
 */
export async function getProjectIntegrations(
  id: number,
  provider?: string
): Promise<ProjectIntegration[]> {
  // Check cache first (30 second TTL)
  const cacheKey = `project:${id}:integrations${provider ? `:${provider}` : ''}`;
  const cached = getCached<ProjectIntegration[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from API
  const params = provider ? new URLSearchParams({ provider }) : undefined;
  const url = params ? `${BASE_URL}/${id}/integrations?${params}` : `${BASE_URL}/${id}/integrations`;
  const response = await apiFetch<GetProjectIntegrationsResponse>(url);

  // Store in cache
  setCache(cacheKey, response.integrations);
  return response.integrations;
}

/**
 * Attach an integration key to a project
 * @param id Project ID
 * @param data Integration attachment data
 * @returns Created integration
 */
export async function attachIntegration(
  id: number,
  data: AttachIntegrationRequest
): Promise<AttachIntegrationResponse> {
  const response = await apiFetch<AttachIntegrationResponse>(
    `${BASE_URL}/${id}/integrations`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );

  // Invalidate project integrations cache
  invalidateCacheByPrefix(`project:${id}:integrations`);
  invalidateCacheByPrefix(`project:${id}`); // Full project details

  return response;
}

/**
 * Detach an integration key from a project
 * @param id Project ID
 * @param keyId Account key ID
 */
export async function detachIntegration(id: number, keyId: number): Promise<void> {
  await apiFetch(`${BASE_URL}/${id}/integrations/${keyId}`, {
    method: 'DELETE',
  });

  // Invalidate project integrations cache
  invalidateCacheByPrefix(`project:${id}:integrations`);
  invalidateCacheByPrefix(`project:${id}`); // Full project details
}
