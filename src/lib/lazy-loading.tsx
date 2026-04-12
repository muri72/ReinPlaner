/**
 * Lazy loading utilities for heavy components
 */
import { lazy, Suspense } from 'react';

// Lazy-loaded components for code splitting
export const LazyPlanningCalendar = lazy(() => import('@/components/planning-calendar').then(m => ({ default: m.PlanningCalendar })));
export const LazyTemplateEditor = lazy(() => import('@/components/template-editor').then(m => ({ default: m.TemplateEditor })));
export const LazyWorkTimeReportForm = lazy(() => import('@/components/work-time-report-form').then(m => ({ default: m.WorkTimeReportForm })));
export const LazySettingsForm = lazy(() => import('@/components/settings-form').then(m => ({ default: m.SettingsForm })));

// Loading fallback component
export function ComponentLoader({ name = 'Komponente' }: { name?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <span className="ml-3 text-muted-foreground">{name} wird geladen...</span>
    </div>
  );
}

// Lazy wrapper with error boundary
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class LazyErrorBoundary extends React.Component<LazyWrapperProps, State> {
  constructor(props: LazyWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[LazyLoad] Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-red-500">
          <p>Fehler beim Laden der Komponente.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-sm underline hover:text-red-600"
          >
            Erneut versuchen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for preloading components on hover
export function useComponentPreloader() {
  const preload = (importFn: () => Promise<any>) => {
    // Don't preload if already loaded or during server-side rendering
    if (typeof window === 'undefined') return;
    
    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        importFn();
      });
    } else {
      setTimeout(() => importFn(), 1);
    }
  };

  return { preload };
}

// Intersection Observer based loading (load when visible)
export function useIntersectionLazyload(ref: React.RefObject<Element | null>, options?: IntersectionObserverInit) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px', ...options }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, isVisible, options]);

  return isVisible;
}

import { useState, useEffect } from 'react';
