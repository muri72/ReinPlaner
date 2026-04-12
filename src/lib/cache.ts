/**
 * API Response caching with stale-while-revalidate pattern
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number;
  maxAge: number;
}

interface CacheConfig {
  ttl?: number; // Time to live in ms (default: 30 seconds)
  swr?: number; // Stale-while-revalidate window in ms (default: 60 seconds)
}

const defaultConfig: Required<CacheConfig> = {
  ttl: 30000, // 30 seconds
  swr: 60000, // 60 seconds
};

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, Promise<any>>();

  /**
   * Get cached data if available and not expired beyond SWR window
   */
  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;
    const isStale = age > entry.maxAge;
    const isExpired = age > entry.staleTime;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return { data: entry.data, isStale };
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, config: CacheConfig = {}): void {
    const { ttl, swr } = { ...defaultConfig, ...config };
    const now = Date.now();

    this.cache.set(key, {
      data,
      timestamp: now,
      staleTime: now + ttl + swr,
      maxAge: ttl,
    });
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Get or fetch with stale-while-revalidate
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    const cached = this.get<T>(key);

    // Return cached data immediately if available (even if stale)
    if (cached) {
      // If stale, trigger background refresh
      if (cached.isStale && !this.pending.has(key)) {
        this.pending.set(
          key,
          fetcher()
            .then(data => {
              this.set(key, data, config);
              this.pending.delete(key);
            })
            .catch(() => {
              this.pending.delete(key);
            })
        );
      }
      return cached.data;
    }

    // If there's a pending request for this key, wait for it
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Fetch fresh data
    const promise = fetcher()
      .then(data => {
        this.set(key, data, config);
        this.pending.delete(key);
        return data;
      })
      .catch(error => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[]; pending: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      pending: this.pending.size,
    };
  }
}

// Singleton instance
export const apiCache = new ResponseCache();

// Cache key builders
export const cacheKeys = {
  employees: (id?: string) => id ? `employees:${id}` : 'employees:list',
  orders: (id?: string) => id ? `orders:${id}` : 'orders:list',
  customers: (id?: string) => id ? `customers:${id}` : 'customers:list',
  objects: (id?: string) => id ? `objects:${id}` : 'objects:list',
  shifts: (date?: string) => date ? `shifts:${date}` : 'shifts:week',
  timeEntries: (employeeId?: string) => employeeId ? `timeEntries:${employeeId}` : 'timeEntries:all',
  dashboard: () => 'dashboard:overview',
} as const;
