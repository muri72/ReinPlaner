/**
 * Sentry Integration Helpers
 * Utilities for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Capture an error with additional context
 */
export function captureError(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: { id: string; email?: string };
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  }
) {
  Sentry.withScope((scope) => {
    // Set tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Set extra data
    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }

    // Set user context
    if (context?.user) {
      scope.setUser(context.user);
    }

    // Set level
    if (context?.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Wrap an async function with error capture
 */
export async function withErrorCapture<T>(
  operation: () => Promise<T>,
  context: {
    operation: string;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): Promise<T> {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    captureError(error as Error, {
      tags: {
        operation: context.operation,
        ...context.tags,
      },
      extra: context.extra,
    });
    throw error;
  }
}

/**
 * Track Supabase errors
 */
export function trackSupabaseError(
  error: any,
  query: string,
  table?: string
) {
  captureError(new Error(`Supabase Error: ${error.message}`), {
    tags: {
      service: 'supabase',
      table: table || 'unknown',
      query_type: query.split(' ')[0].toLowerCase(), // SELECT, INSERT, etc.
    },
    extra: {
      query,
      error_code: error.code,
      details: error.details,
      hint: error.hint,
    },
    level: 'error',
  });
}

/**
 * Track form submission errors
 */
export function trackFormError(
  error: Error,
  formName: string,
  fields?: Record<string, any>
) {
  captureError(error, {
    tags: {
      component: 'form',
      form: formName,
    },
    extra: {
      formName,
      fields: fields ? Object.keys(fields) : [],
    },
    level: 'warning',
  });
}

/**
 * Track API route errors
 */
export function trackApiError(
  error: Error,
  route: string,
  method: string,
  statusCode?: number
) {
  captureError(error, {
    tags: {
      service: 'api',
      route,
      method,
      status_code: statusCode?.toString() || 'unknown',
    },
    extra: {
      route,
      method,
    },
    level: statusCode && statusCode >= 500 ? 'error' : 'warning',
  });
}

/**
 * Track performance issues
 */
export function trackPerformanceIssue(
  type: 'slow_query' | 'slow_render' | 'large_bundle',
  details: Record<string, any>
) {
  addBreadcrumb(
    `Performance issue: ${type}`,
    'performance',
    'warning',
    details
  );

  Sentry.captureMessage(`Performance Issue: ${type}`, 'warning');
}

/**
 * Get Sentry release version
 */
export function getReleaseVersion(): string {
  return process.env.SENTRY_RELEASE || process.env.npm_package_version || 'unknown';
}

/**
 * Check if Sentry is configured
 */
export function isSentryEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_SENTRY_DSN || !!process.env.SENTRY_DSN;
}

export { Sentry };
