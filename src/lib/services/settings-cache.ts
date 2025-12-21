/**
 * Settings Cache Utility
 *
 * Extracted from settings-service.ts to handle caching logic
 * separately from business logic.
 */

export interface CacheEntry {
  value: any;
  timestamp: number;
}

/**
 * Simple in-memory cache for settings with TTL support
 */
export class SettingsCache {
  private cache = new Map<string, CacheEntry>();
  private cacheTTL: number;

  constructor(cacheTTLMs: number = 5 * 60 * 1000) {
    this.cacheTTL = cacheTTLMs;
  }

  /**
   * Get a value from cache if it exists and is not expired
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      // Cache entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set a value in cache with current timestamp
   */
  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Delete a specific entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache key for a setting
   */
  getCacheKey(key: string, scope: string, scopeId?: string): string {
    return `${key}:${scope}:${scopeId || 'global'}`;
  }

  /**
   * Check if a cached entry exists and is valid
   */
  hasValid(key: string): boolean {
    return this.get(key) !== null;
  }
}
