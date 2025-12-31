/**
 * Simple in-memory cache for API responses
 * Reduces duplicate API calls to CloudFlare Workers (saves tokens)
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Get cached data if it exists and hasn't expired
 * @param key - Cache key (e.g., 'integrations:123', 'zones')
 * @param ttl - Time to live in milliseconds (default: 30 seconds)
 * @returns Cached data or null if expired/missing
 */
export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data as T;
  }
  // Clean up expired entry
  if (cached) {
    cache.delete(key);
  }
  return null;
}

/**
 * Store data in cache with expiration
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Time to live in milliseconds (default: 30 seconds)
 */
export function setCache<T>(key: string, data: T, ttl: number = 30000): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttl,
  });
}

/**
 * Invalidate (delete) cached data for a specific key
 * @param key - Cache key to invalidate
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries matching a prefix
 * @param prefix - Cache key prefix (e.g., 'integrations:' to clear all integration caches)
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
