'use client';
/**
 * Scorecard.tsx — Live Production Readiness Scorecard (admin only).
 *
 * Eleven dimensions graded from REAL signals: DB/backup freshness, firing
 * alerts, error rates, migration status, docs/log counts, API catalog size —
 * paired with code-audit claims (each with its verification date).
 * Data: GET /api/devops/scorecard · auto-refresh 60s.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, ChevronDown, ChevronUp, Lock, ExternalLink } from 'lucide-react';
import client from '@/api/client';

interface Check { label: string; status: 'pass' | 'warn' | 'fail'; detail: string }
interface Dimension { key: string; label: string; grade: string; score: number; checks: Check[] }
interface ScorecardData {
  overall: { grade: string; score: number };
  dimensions: Dimension[];
  liveSignals: Record<string, number | boolean>;
  generatedAt: string;
}

const gradeColor = (g: string) =>
  g.startsWith('A') ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
  : g.startsWith('B') ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
  : 'text-red-500 bg-red-500/10 border-red-500/30';
const checkIcon = (s: string) => s === 'pass' ? '✓' : s === 'warn' ? '⚠' : '✗';
const checkColor = (s: string) => s === 'pass' ? 'text-emerald-500' : s === 'warn' ? 'text-amber-500' : 'text-red-500';

export default function Scorecard() {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/api/devops/scorecard');
      setData(data); setError(null); setLastRefresh(new Date());
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      setError(status === 403 ? 'Admin access required.' : 'Could not load the scorecard — is the backend running?');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Lock className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" /> Production Readiness Scorecard
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Eleven dimensions graded from live signals + code audits · auto-refreshes every 60s
            · last checked {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="p-2 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors" title="Refresh now">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-500">{error}</div>
      ) : data && (
        <>
          {/* Overall */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 flex items-center gap-6 flex-wrap">
            <div className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center ${gradeColor(data.overall.grade)}`}>
              <span className="text-4xl font-bold font-mono">{data.overall.grade}</span>
              <span className="text-[10px] font-mono">{data.overall.score}/100</span>
            </div>
            <div className="flex-1 min-w-[220px]">
              <p className="text-sm font-semibold mb-2">Live signals</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                {[
                  ['API endpoints', data.liveSignals.endpoints],
                  ['Prod docs', data.liveSignals.prodDocs],
                  ['Task reports', data.liveSignals.logReports],
                  ['Migrations', data.liveSignals.migrationsApplied ?? '—'],
                  ['Errors / hr', data.liveSignals.errorsLastHour],
                  ['Payments 24h', data.liveSignals.payments24h],
                  ['Backup age', data.liveSignals.backupAgeH !== null && data.liveSignals.backupAgeH !== undefined ? `${data.liveSignals.backupAgeH}h` : '—'],
                  ['Redis', data.liveSignals.redisUp ? 'up' : 'down'],
                ].map(([label, v]) => (
                  <div key={String(label)} className="rounded-lg bg-secondary/40 px-2.5 py-1.5 border border-border/30">
                    <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
                    <p className="text-xs font-bold">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
            <a href="/admin/devops" className="text-[11px] font-semibold text-violet-500 hover:underline inline-flex items-center gap-1">
              Open Dev Ops console <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Dimensions */}
          <div className="grid gap-3">
            {data.dimensions.map((d) => {
              const isOpen = expanded === d.key;
              return (
                <div key={d.key} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                  <div role="button" tabIndex={0}
                    onClick={() => setExpanded(isOpen ? null : d.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(isOpen ? null : d.key); } }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors cursor-pointer">
                    <span className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center font-bold font-mono text-sm shrink-0 ${gradeColor(d.grade)}`}>
                      {d.grade}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{d.label}</p>
                      <div className="h-1.5 rounded-full bg-secondary mt-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${d.score >= 87 ? 'bg-emerald-500' : d.score >= 73 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${d.score}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{d.score}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                  {isOpen && (
                    <div className="border-t border-border/30 px-4 py-3 space-y-1.5 bg-secondary/10">
                      {d.checks.map((c) => (
                        <div key={c.label} className="flex items-start gap-2 text-[11px]">
                          <span className={`font-mono font-bold shrink-0 ${checkColor(c.status)}`}>{checkIcon(c.status)}</span>
                          <span className="font-medium shrink-0">{c.label}</span>
                          <span className="text-muted-foreground truncate">— {c.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
