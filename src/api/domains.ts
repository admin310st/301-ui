/**
 * Domains API client
 */

import { apiFetch } from './client';

/**
 * Batch zone creation request
 */
export interface BatchZoneRequest {
  account_key_id: number;
  domains: string[];
}

/**
 * Successful zone creation result
 */
export interface BatchZoneSuccess {
  domain: string;
  zone_id: number;
  cf_zone_id: string;
  name_servers: string[];
  status: string;
}

/**
 * Failed zone creation result
 */
export interface BatchZoneFailed {
  domain: string;
  error: string;
  error_message: string;
}

/**
 * Batch zone creation response
 */
export interface BatchZoneResponse {
  ok: boolean;
  results: {
    success: BatchZoneSuccess[];
    failed: BatchZoneFailed[];
  };
}

/**
 * Create zones in batch (up to 10 root domains)
 *
 * POST /domains/zones/batch
 *
 * @param data - Request payload with account_key_id and domains array
 * @returns Batch operation results with success/failed lists
 */
export async function createZonesBatch(data: BatchZoneRequest): Promise<BatchZoneResponse> {
  return apiFetch<BatchZoneResponse>('/domains/zones/batch', {
    method: 'POST',
    body: JSON.stringify(data),
    showLoading: 'cf', // Orange shimmer for Cloudflare operations
  });
}
