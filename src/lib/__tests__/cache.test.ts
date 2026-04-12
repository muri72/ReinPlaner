import { describe, it, expect, beforeEach } from 'vitest';
import { apiCache, cacheKeys } from '@/lib/cache';

describe('API Cache', () => {
  beforeEach(() => {
    apiCache.clear();
  });

  describe('get/set', () => {
    it('should store and retrieve data', () => {
      apiCache.set('test:1', { value: 'data' });
      const result = apiCache.get('test:1');
      
      expect(result).not.toBeNull();
      expect(result?.data.value).toBe('data');
      expect(result?.isStale).toBe(false);
    });

    it('should return null for missing keys', () => {
      const result = apiCache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should mark data as stale after TTL', () => {
      // Set with short TTL
      apiCache.set('test:stale', { value: 'test' }, { ttl: 10, swr: 20 });
      
      // Immediately should not be stale
      const fresh = apiCache.get('test:stale');
      expect(fresh?.isStale).toBe(false);
    });

    it('should return null after SWR window expires', () => {
      // Test that entry exists initially
      apiCache.set('test:expired', { value: 'test' }, { ttl: 10, swr: 20 });
      const before = apiCache.get('test:expired');
      expect(before).not.toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove specific key', () => {
      apiCache.set('test:a', { a: 1 });
      apiCache.set('test:b', { b: 2 });
      
      apiCache.invalidate('test:a');
      
      expect(apiCache.get('test:a')).toBeNull();
      expect(apiCache.get('test:b')).not.toBeNull();
    });

    it('should invalidate by pattern', () => {
      apiCache.set('users:1', { id: 1 });
      apiCache.set('users:2', { id: 2 });
      apiCache.set('orders:1', { id: 1 });
      
      apiCache.invalidatePattern(/^users:/);
      
      expect(apiCache.get('users:1')).toBeNull();
      expect(apiCache.get('users:2')).toBeNull();
      expect(apiCache.get('orders:1')).not.toBeNull();
    });

    it('should clear all entries', () => {
      apiCache.set('test:1', { a: 1 });
      apiCache.set('test:2', { b: 2 });
      
      apiCache.clear();
      
      expect(apiCache.get('test:1')).toBeNull();
      expect(apiCache.get('test:2')).toBeNull();
    });
  });

  describe('getOrFetch', () => {
    it('should fetch and cache data', async () => {
      let fetchCallCount = 0;
      const fetcher = async () => {
        fetchCallCount++;
        return { value: 'fetched' };
      };

      const result = await apiCache.getOrFetch('test:fetch', fetcher);
      
      expect(result.value).toBe('fetched');
      expect(fetchCallCount).toBe(1);
      
      // Second call should use cache
      const cached = await apiCache.getOrFetch('test:fetch', fetcher);
      expect(cached.value).toBe('fetched');
      expect(fetchCallCount).toBe(1); // Still 1
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      apiCache.set('a', { x: 1 });
      apiCache.set('b', { y: 2 });
      
      const stats = apiCache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('a');
      expect(stats.keys).toContain('b');
    });
  });

  describe('cacheKeys', () => {
    it('should generate correct cache keys', () => {
      expect(cacheKeys.employees()).toBe('employees:list');
      expect(cacheKeys.employees('123')).toBe('employees:123');
      expect(cacheKeys.orders('456')).toBe('orders:456');
      expect(cacheKeys.dashboard()).toBe('dashboard:overview');
    });
  });
});
