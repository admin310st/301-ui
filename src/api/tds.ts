/**
 * API client for TDS (Traffic Distribution System)
 * Base URL: https://api.301.st
 *
 * Key patterns:
 * - Presets/Params: long TTL (24h), rarely change
 * - Rules list: short TTL (30s), changes with CRUD
 * - Rule detail: short TTL (30s), abortPrevious on rule switch
 * - Mutations: invalidate cache, UI does optimistic updates
 */

import { apiFetch } from './client';
import { getCached, setCache, invalidateCacheByPrefix } from './cache';
import { withInFlight, abortPrevious } from './ui-client';
import type {
  TdsPreset,
  TdsParam,
  TdsRule,
  TdsDomainBinding,
  GetTdsPresetsResponse,
  GetTdsRulesResponse,
  GetTdsRuleResponse,
  CreateTdsRuleRequest,
  CreateFromPresetRequest,
  CreateFromPresetResponse,
  UpdateTdsRuleRequest,
  ReorderRulesRequest,
  BindDomainsRequest,
  BindDomainsResponse,
  GetRuleDomainsResponse,
} from './types';

// =============================================================================
// Cache TTL Constants
// =============================================================================

const TTL_PRESETS = 24 * 60 * 60 * 1000; // 24 hours
const TTL_PARAMS = 24 * 60 * 60 * 1000;  // 24 hours
const TTL_RULES = 30 * 1000;             // 30 seconds
const TTL_RULE_DETAIL = 30 * 1000;       // 30 seconds
const TTL_DOMAINS = 30 * 1000;           // 30 seconds

// =============================================================================
// Reference Data (long-lived, rarely change)
// =============================================================================

/**
 * Get available TDS presets (S1-S5, L1-L3)
 * TTL: 24 hours
 */
export async function getPresets(): Promise<TdsPreset[]> {
  const cacheKey = 'tds:presets:v1';
  const cached = getCached<TdsPreset[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetTdsPresetsResponse>('/tds/presets', {
      showLoading: false,
    });
    setCache(cacheKey, response.presets, TTL_PRESETS);
    return response.presets;
  });
}

/**
 * Get available TDS condition parameters
 * TTL: 24 hours
 */
export async function getParams(): Promise<TdsParam[]> {
  const cacheKey = 'tds:params:v1';
  const cached = getCached<TdsParam[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<{ ok: boolean; params: TdsParam[] }>('/tds/params', {
      showLoading: false,
    });
    setCache(cacheKey, response.params, TTL_PARAMS);
    return response.params;
  });
}

// =============================================================================
// Rules (main working list)
// =============================================================================

/**
 * Get all TDS rules for the account
 * TTL: 30 seconds
 *
 * @param force Skip cache (for explicit Refresh button)
 */
export async function getRules(force?: boolean): Promise<GetTdsRulesResponse> {
  const cacheKey = 'tds:rules:v1';

  if (!force) {
    const cached = getCached<GetTdsRulesResponse>(cacheKey);
    if (cached) return cached;
  }

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetTdsRulesResponse>('/tds/rules', {
      showLoading: false,
    });
    setCache(cacheKey, response, TTL_RULES);
    return response;
  });
}

/**
 * Get single TDS rule with domain bindings
 * TTL: 30 seconds
 * Uses abort for "last wins" when switching rules
 */
export async function getRule(id: number): Promise<GetTdsRuleResponse> {
  const cacheKey = `tds:rule:${id}:v1`;
  const cached = getCached<GetTdsRuleResponse>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const signal = abortPrevious('tds:ruleDetail');

    const response = await apiFetch<GetTdsRuleResponse>(`/tds/rules/${id}`, {
      signal,
      showLoading: false,
    });
    setCache(cacheKey, response, TTL_RULE_DETAIL);
    return response;
  });
}

// =============================================================================
// Mutations (with cache invalidation)
// =============================================================================

/**
 * Create TDS rule manually
 */
export async function createRule(
  data: CreateTdsRuleRequest
): Promise<{ ok: boolean; rule: TdsRule }> {
  const response = await apiFetch<{ ok: boolean; rule: TdsRule }>(
    '/tds/rules',
    {
      method: 'POST',
      body: JSON.stringify(data),
      showLoading: 'brand',
    }
  );

  invalidateCacheByPrefix('tds:');
  return response;
}

/**
 * Create TDS rule from preset
 */
export async function createRuleFromPreset(
  data: CreateFromPresetRequest
): Promise<CreateFromPresetResponse> {
  const response = await apiFetch<CreateFromPresetResponse>(
    '/tds/rules/from-preset',
    {
      method: 'POST',
      body: JSON.stringify(data),
      showLoading: 'brand',
    }
  );

  invalidateCacheByPrefix('tds:');
  return response;
}

/**
 * Update TDS rule
 */
export async function updateRule(
  id: number,
  data: UpdateTdsRuleRequest
): Promise<void> {
  await apiFetch(`/tds/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    showLoading: 'brand',
  });

  invalidateCacheByPrefix('tds:');
}

/**
 * Delete TDS rule
 */
export async function deleteRule(id: number): Promise<void> {
  await apiFetch(`/tds/rules/${id}`, {
    method: 'DELETE',
    showLoading: 'brand',
  });

  invalidateCacheByPrefix('tds:');
}

/**
 * Reorder TDS rules (batch priority update)
 */
export async function reorderRules(data: ReorderRulesRequest): Promise<void> {
  await apiFetch('/tds/rules/reorder', {
    method: 'PATCH',
    body: JSON.stringify(data),
    showLoading: 'brand',
  });

  invalidateCacheByPrefix('tds:');
}

// =============================================================================
// Domain Bindings
// =============================================================================

/**
 * Get domains bound to a rule
 * TTL: 30 seconds
 */
export async function getRuleDomains(ruleId: number): Promise<TdsDomainBinding[]> {
  const cacheKey = `tds:rule:${ruleId}:domains:v1`;
  const cached = getCached<TdsDomainBinding[]>(cacheKey);
  if (cached) return cached;

  return withInFlight(cacheKey, async () => {
    const response = await apiFetch<GetRuleDomainsResponse>(
      `/tds/rules/${ruleId}/domains`,
      { showLoading: false }
    );
    setCache(cacheKey, response.domains, TTL_DOMAINS);
    return response.domains;
  });
}

/**
 * Bind domains to a rule
 */
export async function bindDomains(
  ruleId: number,
  domainIds: number[]
): Promise<BindDomainsResponse> {
  const data: BindDomainsRequest = { domain_ids: domainIds };

  const response = await apiFetch<BindDomainsResponse>(
    `/tds/rules/${ruleId}/domains`,
    {
      method: 'POST',
      body: JSON.stringify(data),
      showLoading: 'brand',
    }
  );

  invalidateCacheByPrefix('tds:');
  return response;
}

/**
 * Unbind a domain from a rule
 */
export async function unbindDomain(
  ruleId: number,
  domainId: number
): Promise<void> {
  await apiFetch(`/tds/rules/${ruleId}/domains/${domainId}`, {
    method: 'DELETE',
    showLoading: 'brand',
  });

  invalidateCacheByPrefix('tds:');
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Invalidate all TDS-related caches
 */
export function invalidateAllTdsCaches(): void {
  invalidateCacheByPrefix('tds:');
}
