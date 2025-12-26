import { apiFetch } from './client';
import type {
  IntegrationKey,
  InitCloudflareRequest,
  InitNamecheapRequest,
  UpdateKeyRequest,
  InitIntegrationResponse,
  GetKeysResponse,
  GetKeyResponse,
} from './types';

const BASE_URL = '/integrations';

/**
 * Get all integration keys for the current account
 * @param accountId Account ID (required, from JWT or auth state)
 * @param provider Optional provider filter (cloudflare, namecheap, etc.)
 * @returns Array of integration keys
 */
export async function getIntegrationKeys(accountId: number, provider?: string): Promise<IntegrationKey[]> {
  const params = new URLSearchParams({ account_id: accountId.toString() });
  if (provider) {
    params.set('provider', provider);
  }
  const response = await apiFetch<GetKeysResponse>(`${BASE_URL}/keys?${params}`);
  return response.keys;
}

/**
 * Get a single integration key by ID
 * @param id Key ID
 * @returns Integration key details
 */
export async function getIntegrationKey(id: number): Promise<IntegrationKey> {
  const response = await apiFetch<GetKeyResponse>(`${BASE_URL}/keys/${id}`);
  return response.key;
}

/**
 * Update integration key metadata (alias or status)
 * @param id Key ID
 * @param data Updated fields
 */
export async function updateIntegrationKey(id: number, data: UpdateKeyRequest): Promise<void> {
  await apiFetch(`${BASE_URL}/keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an integration key
 * @param id Key ID
 */
export async function deleteIntegrationKey(id: number): Promise<void> {
  await apiFetch(`${BASE_URL}/keys/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Initialize Cloudflare integration (bootstrap → working token flow)
 * @param data Cloudflare account ID and bootstrap token
 * @returns Integration response with key_id, is_rotation, and sync info
 */
export async function initCloudflare(data: InitCloudflareRequest): Promise<InitIntegrationResponse> {
  const response = await apiFetch<InitIntegrationResponse>(`${BASE_URL}/cloudflare/init`, {
    method: 'POST',
    body: JSON.stringify(data),
    showLoading: 'cf',
  });
  return response;
}

/**
 * Initialize Namecheap integration
 * @param data Namecheap username and API key
 * @returns Created key ID
 */
export async function initNamecheap(data: InitNamecheapRequest): Promise<number> {
  const response = await apiFetch<InitIntegrationResponse>(`${BASE_URL}/namecheap/init`, {
    method: 'POST',
    body: JSON.stringify(data),
    showLoading: 'brand',
  });
  return response.key_id;
}
