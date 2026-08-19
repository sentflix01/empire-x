'use client';
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { reportClientError } from './GlobalErrorReporter';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches render errors in child components.
 * Reports to:
 *  1. DevOps Live Error Feed via /api/devops/errors/report
 *  2. Sentry (when configured)
 * Prevents a single broken component from crashing the entire page.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);

    // Report to DevOps live error feed
    reportClientError({
      message: error.message,
      name:    error.name || 'ReactRenderError',
      stack:   error.stack || null,
      context: {
        componentStack: info.componentStack?.slice(0, 1000),
        errorType: 'react_render',
      },
    });

    // Also report to Sentry when configured
    try {
      const Sentry = (globalThis as any).__SENTRY__;
      if (Sentry?.captureException) {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      }
    } catch {
      // Sentry not configured — fail silently
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-center my-4"
        >
          <AlertCircle className="w-8 h-8 text-destructive/50 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-medium text-destructive">Something went wrong loading this section.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-xs text-primary hover:underline font-medium"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
