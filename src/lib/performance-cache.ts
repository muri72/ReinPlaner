// High-Performance Caching für Dashboard Widgets
// Verhindert unnötige Database Queries

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache entries
}

export class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;

  constructor(config: CacheConfig = { ttl: 30000, maxSize: 50 }) {
    this.config = config;
  }

  set<T>(key: string, data: T): void {
    // Clean expired entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.cleanup();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.config.ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    // If still too many entries, delete oldest 25%
    if (this.cache.size >= this.config.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = Math.ceil(this.config.maxSize * 0.25);

      for (let i = 0; i < toDelete; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance for global use
export const dashboardCache = new PerformanceCache({
  ttl: 30000, // 30 seconds cache
  maxSize: 100
});

// Cache keys generator
export const createCacheKey = (prefix: string, params: Record<string, any>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

// Specific cache keys for dashboard widgets
export const CACHE_KEYS = {
  TODAYS_ORDERS: (userId: string, date: string) => `todays_orders:${userId}:${date}`,
  EMPLOYEE_ASSIGNMENTS: (userId: string) => `employee_assignments:${userId}`,
  CUSTOMER_DATA: (customerIds: string[]) => `customers:${customerIds.sort().join(',')}`,
  OBJECT_DATA: (objectIds: string[]) => `objects:${objectIds.sort().join(',')}`,
} as const;
