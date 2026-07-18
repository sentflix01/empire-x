// @ts-check
'use client';
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * ErrorState — renders a user-friendly error message with an optional retry button.
 * Use this in views whenever an API call fails.
 *
 * Feature: professional-grade-upgrade
 * Requirements: 2.1, 2.2
 */
export default function ErrorState({ message, onRetry, retryLabel = 'Try again' }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl border border-destructive/20 bg-destructive/5"
    >
      <AlertCircle className="w-10 h-10 text-destructive/60 mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-destructive mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          aria-label={retryLabel}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
