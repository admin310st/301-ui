/**
 * Legacy redirect types for UI rendering
 *
 * Used by adapter.ts to convert API types (RedirectDomain) to this format.
 * TODO: Migrate UI code to use API types directly, then remove this file.
 */

export type RedirectCode = 301 | 302;
export type SyncStatus = 'never' | 'pending' | 'synced' | 'error';
export type DomainStatus = 'active' | 'parked' | 'expired';
export type CfImplementation = 'redirect_rule' | 'worker' | null;
export type SiteType = 'landing' | 'tds' | 'hybrid';
export type DomainRole = 'acceptor' | 'donor' | 'reserve';
export type AnalyticsTrend = 'up' | 'down' | 'neutral';

/**
 * Analytics data for a redirect or target domain
 */
export interface RedirectAnalytics {
  clicks_total: number;      // Total clicks all-time
  clicks_24h: number;         // Clicks in last 24 hours
  clicks_7d: number;          // Clicks in last 7 days
  clicks_30d: number;         // Clicks in last 30 days
  trend: AnalyticsTrend;      // Trend indicator (vs previous period)
  last_click_at: string | null; // ISO timestamp of last click
}

export interface DomainRedirect {
  id: number;

  // Source
  domain_id: number;
  domain: string;  // e.g., "old-domain.com"
  domain_status: DomainStatus;
  role: DomainRole;  // acceptor = primary (receives traffic), donor = redirects to acceptor, reserve = not attached

  // Target
  target_url: string | null;  // null = no redirect
  has_redirect: boolean;  // explicit flag: true = redirect configured

  // Redirect Type
  redirect_code: RedirectCode;  // 301 = permanent, 302 = temporary

  // Status
  enabled: boolean;

  // Cloudflare Sync
  cf_rule_id: string | null;  // Cloudflare Redirect Rule ID
  cf_implementation: CfImplementation;
  last_sync_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;

  // Grouping
  site_id: number;
  site_name: string;  // e.g., "CryptoBoss (En)"
  site_tag?: string;  // e.g., "crypto-en"
  site_flag: string;  // emoji flag for display
  site_type: SiteType;  // 'landing' | 'tds' | 'hybrid'
  site_status?: 'active' | 'paused' | 'archived';  // Site status
  project_id: number;
  project_name: string;

  // Metadata
  created_at: string;
  updated_at: string;

  // Canonical redirect (T3/T4 www normalization, separate from main redirect)
  canonical_redirect?: {
    id: number;
    template_id: string;
    target_url: string | null;
    sync_status: SyncStatus;
    sync_error: string | null;
    last_sync_at: string | null;
    enabled: boolean;
  } | null;

  // Analytics (optional - from Cloudflare GraphQL Analytics API)
  analytics?: RedirectAnalytics;
}
