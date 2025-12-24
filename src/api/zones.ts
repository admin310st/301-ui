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
 * Get all Cloudflare zones for current user
 */
export async function getZones(): Promise<CloudflareZone[]> {
  const response = await apiFetch<GetZonesResponse>('/zones');
  return response.zones;
}
