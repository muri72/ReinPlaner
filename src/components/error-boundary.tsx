"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to Sentry in all environments (including development and staging)
    // Only skip if explicitly disabled
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV !== 'test') {
      // Import Sentry dynamically to avoid SSR issues
      import('@sentry/nextjs').then((SentryModule) => {
        const Sentry = SentryModule.default || SentryModule;
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
            errorBoundary: {
              name: 'ErrorBoundary',
              props: JSON.stringify(this.props, null, 2).substring(0, 1000), // First 1000 chars
            },
          },
          tags: {
            errorBoundary: 'react',
            component: 'ErrorBoundary',
          },
        });
      }).catch((importError) => {
        console.error('Failed to import Sentry:', importError);
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Etwas ist schiefgelaufen
            </CardTitle>
            <CardDescription>
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Erneut versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

interface SimpleErrorBoundaryProps {
  children: ReactNode;
  message?: string;
  onRetry?: () => void;
}

export function SimpleErrorBoundary({
  children,
  message = "Etwas ist schiefgelaufen",
  onRetry,
}: SimpleErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[200px] border border-destructive/20 rounded-lg bg-destructive/5">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{message}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Erneut versuchen
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Helper to create error boundaries for specific features
export function createFeatureErrorBoundary(
  featureName: string,
  onError?: (error: Error) => void
) {
  return (props: { children: ReactNode }) => {
    return (
      <ErrorBoundary
        onError={(error) => {
          console.error(`Error in ${featureName}:`, error);
          onError?.(error);
        }}
      >
        {props.children}
      </ErrorBoundary>
    );
  };
}
