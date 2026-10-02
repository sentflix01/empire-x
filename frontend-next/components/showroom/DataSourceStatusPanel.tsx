'use client'
import React, { useCallback, useEffect, useState } from 'react';
import { HealthRecord } from '../../types/externalApi';
import { apiFetch } from '@/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  showroomId: string;
}

type DisplayStatus = 'healthy' | 'failing' | 'never_fetched';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * getDisplayStatus — client-side guard/validator for the status field.
 *
 * Design Property 17: if record.success === false, always returns 'failing'.
 * The 'healthy' branch is only reachable when record.success === true.
 * If status is anything other than a known value, defaults to 'never_fetched'.
 *
 * Validates: Requirements 8.2, 8.3
 */
export function getDisplayStatus(record: HealthRecord | null | undefined): DisplayStatus {
  if (!record) {
    return 'never_fetched';
  }

  // Explicit guard: success=false can NEVER reach the healthy branch.
  // This check runs before consulting the server-side status field so a
  // success=false record cannot slip through as 'healthy' under any circumstance.
  if (record.success === false) {
    return 'failing';
  }

  // Only accept known status values from the server; fall back to never_fetched otherwise.
  if (record.status === 'healthy' || record.status === 'failing' || record.status === 'never_fetched') {
    return record.status;
  }

  return 'never_fetched';
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: DisplayStatus;
  httpStatus?: number | null;
}

function StatusBadge({ status, httpStatus }: StatusBadgeProps) {
  if (status === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Healthy
      </span>
    );
  }

  if (status === 'failing') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Failing{httpStatus ? ` (${httpStatus})` : ''}
      </span>
    );
  }

  // never_fetched
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      Never fetched
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DataSourceStatusPanel({ showroomId }: Props) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/showrooms/${showroomId}/external-sources/health`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Failed to load health data (${res.status})`);
      }
      const data: HealthRecord[] = await res.json();
      setRecords(data);
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [showroomId]);

  // Fetch on mount (covers initial render + tab navigation without full page reload)
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleRefresh = async (record: HealthRecord) => {
    const sourceId = record.source_id;
    if (!sourceId) return;

    setRefreshingIds(prev => new Set(prev).add(sourceId));
    try {
      const res = await apiFetch(
        `/api/showrooms/${showroomId}/external-sources/${sourceId}/refresh`,
        { method: 'POST', credentials: 'include' }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Refresh failed:', body?.error ?? res.status);
      }
      // Re-fetch health data to reflect the cleared cache state
      await fetchHealth();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
        </div>
        <button
          onClick={fetchHealth}
          className="mt-3 text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900"
        >
          Try again
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No external data sources configured for this showroom.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">Data Source Status</h3>
        <button
          onClick={fetchHealth}
          className="text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900"
        >
          Refresh all
        </button>
      </div>

      {records.map(record => {
        const displayStatus = getDisplayStatus(record);
        const sourceId = record.source_id;
        const isRefreshing = sourceId ? refreshingIds.has(sourceId) : false;

        return (
          <div
            key={record.section_key}
            className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2"
          >
            {/* Header row: section name + status badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground truncate">
                {record.section_label || record.section_key}
              </span>
              <StatusBadge status={displayStatus} httpStatus={record.http_status} />
            </div>

            {/* URL preview */}
            <div className="text-[11px] text-muted-foreground truncate" title={record.url_preview}>
              {record.url_preview || '—'}
            </div>

            {/* Footer row: last-fetched + refresh button */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] text-muted-foreground">
                Last fetched: {formatTimestamp(record.fetched_at)}
              </span>
              {sourceId && (
                <button
                  type="button"
                  disabled={isRefreshing}
                  onClick={() => handleRefresh(record)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isRefreshing ? 'Refreshing…' : 'Refresh Cache'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
