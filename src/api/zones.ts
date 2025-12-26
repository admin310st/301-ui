/**
 * API client for Cloudflare zones
 * Base URL: https://api.301.st
 */

import { apiFetch } from './client';

/**
 * Cloudflare zone object
 */
export interface CloudflareZone {
  id: number;
  key_id: number;
  cf_zone_id: string;
  status: 'active' | 'pending' | 'error' | 'deleted';
  plan: 'free' | 'pro' | 'business' | 'enterprise';
  ns_expected: string;
  verified: number;
  ssl_status: 'valid' | 'expired' | 'error' | 'none';
  ssl_mode: 'off' | 'flexible' | 'full' | 'strict';
  auto_https: number;
  caching_level: string;
  waf_mode: string;
  last_sync_at: string;
  created_at: string;
  root_domain: string;
}

/**
 * Response from GET /zones
 */
export interface GetZonesResponse {
  ok: boolean;
  zones: CloudflareZone[];
}

/**
 * Response from POST /zones/sync
 */
export interface SyncZonesResponse {
  ok: boolean;
  zones_synced: number;
  domains_synced: number;
  errors: any[];
}

/**
 * Get all Cloudflare zones for current user
 */
export async function getZones(): Promise<CloudflareZone[]> {
  const response = await apiFetch<GetZonesResponse>('/zones');
  return response.zones;
}

/**
 * Manually sync zones from Cloudflare to D1
 * @param accountKeyId - Optional ID of the Cloudflare account key (backend may determine from JWT)
 */
export async function syncZones(accountKeyId?: number): Promise<SyncZonesResponse> {
  const body = accountKeyId ? { account_key_id: accountKeyId } : {};
  const response = await apiFetch<SyncZonesResponse>('/zones/sync', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response;
}
