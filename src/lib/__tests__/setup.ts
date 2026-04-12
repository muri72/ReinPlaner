// Vitest setup file
import { vi } from 'vitest';

// Only run browser mocks in browser environment
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    
    constructor(
      private callback: IntersectionObserverCallback,
      private options?: IntersectionObserverInit
    ) {}
    
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  window.IntersectionObserver = MockIntersectionObserver as any;

  // Mock requestIdleCallback
  (window as any).requestIdleCallback = vi.fn((callback: Function) => setTimeout(() => callback(), 1));
  (window as any).cancelIdleCallback = vi.fn();
}

// Mock process.memoryUsage for Node environment
if (typeof process !== 'undefined' && process.memoryUsage) {
  // Already exists in Node
}
