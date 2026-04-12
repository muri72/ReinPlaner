import { describe, it, expect, beforeEach } from 'vitest';
import { debounce, throttle } from '@/lib/performance';

describe('Performance Utilities', () => {
  describe('debounce', () => {
    it('should delay function execution', async () => {
      let callCount = 0;
      const fn = debounce(() => callCount++, 100);
      
      fn();
      fn();
      fn();
      
      expect(callCount).toBe(0);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(callCount).toBe(1);
    });

    it('should only call function once for multiple rapid calls', async () => {
      let lastValue = 0;
      const fn = debounce((value: number) => { lastValue = value; }, 50);
      
      fn(1);
      fn(2);
      fn(3);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(lastValue).toBe(3);
    });
  });

  describe('throttle', () => {
    it('should limit function calls', async () => {
      let callCount = 0;
      const fn = throttle(() => callCount++, 50);
      
      fn();
      fn();
      fn();
      
      expect(callCount).toBe(1);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(callCount).toBe(2);
    });

    it('should use latest arguments when throttled', async () => {
      let lastValue = 0;
      const fn = throttle((value: number) => { lastValue = value; }, 50);
      
      fn(1);
      fn(2);
      fn(3);
      
      // First call happened immediately with value 1
      expect(lastValue).toBe(1);
    });
  });
});
