/**
 * Performance monitoring utilities for the dashboard
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Start a named timer
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End a named timer and record the duration
   */
  measure(name: string): number {
    const start = this.marks.get(name);
    if (!start) {
      console.warn(`[Performance] No start mark found for: ${name}`);
      return 0;
    }
    const duration = performance.now() - start;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });
    this.marks.delete(name);
    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics filtered by name pattern
   */
  getMetricsByPattern(pattern: RegExp): PerformanceMetric[] {
    return this.metrics.filter(m => pattern.test(m.name));
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Get summary statistics
   */
  getSummary(): Record<string, { count: number; total: number; avg: number; min: number; max: number }> {
    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = { count: 0, total: 0, min: Infinity, max: -Infinity, avg: 0 };
      }
      acc[metric.name].count++;
      acc[metric.name].total += metric.duration;
      acc[metric.name].min = Math.min(acc[metric.name].min, metric.duration);
      acc[metric.name].max = Math.max(acc[metric.name].max, metric.duration);
      acc[metric.name].avg = acc[metric.name].total / acc[metric.name].count;
      return acc;
    }, {} as Record<string, { count: number; total: number; avg: number; min: number; max: number }>);

    return grouped;
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// React hook for component render timing
export function useRenderTiming(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (duration > 16) { // > 1 frame at 60fps
        console.warn(`[Performance] Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  return () => {};
}

// Debounce utility for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle utility for frequent events
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memory usage check (Node.js only)
export function getMemoryUsage(): { heapUsed: number; heapTotal: number; external: number } | null {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const { heapUsed, heapTotal, external } = process.memoryUsage();
    return {
      heapUsed: Math.round(heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(heapTotal / 1024 / 1024), // MB
      external: Math.round(external / 1024 / 1024), // MB
    };
  }
  return null;
}

// Log performance summary in development
export function logPerformanceSummary(): void {
  if (process.env.NODE_ENV === 'development') {
    const summary = perfMonitor.getSummary();
    console.group('[Performance Summary]');
    for (const [name, stats] of Object.entries(summary)) {
      console.log(
        `${name}: avg=${stats.avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms (${stats.count} calls)`
      );
    }
    const memory = getMemoryUsage();
    if (memory) {
      console.log(`Memory: heap=${memory.heapUsed}MB / ${memory.heapTotal}MB`);
    }
    console.groupEnd();
  }
}
