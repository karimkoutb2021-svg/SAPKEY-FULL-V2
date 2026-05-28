/**
 * Simple in-memory cache for Supabase queries to reduce egress.
 * Cache entries expire after a configurable TTL.
 * Used for frequently-accessed, rarely-changing data like categories, branding, etc.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

// Short TTL for semi-dynamic data: 30 seconds
export const SHORT_TTL = 30 * 1000;

// Long TTL for static data: 30 minutes
export const LONG_TTL = 30 * 60 * 1000;

/**
 * Get cached data or fetch it from the provided function.
 * @param key - Unique cache key
 * @param fetcher - Async function that fetches the data
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const existing = cache.get(key);
  
  if (existing && Date.now() - existing.timestamp < existing.ttl) {
    return existing.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now(), ttl });
  return data;
}

/**
 * Invalidate a specific cache key
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
