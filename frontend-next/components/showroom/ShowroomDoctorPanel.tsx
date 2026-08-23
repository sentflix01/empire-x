'use client';
/**
 * ShowroomDoctorPanel.tsx — "Showroom Doctor" scorecard (Phase 1 UI).
 * Fetches GET /api/showrooms/:id/doctor (owner/admin) and renders the
 * deterministic diagnosis: score, sub-grades, prioritized findings with
 * fix deep-links into the builder.
 */
import React, { useState } from 'react';
import { Loader2, Stethoscope, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';

interface Finding { id: string; severity: 'critical'|'high'|'medium'|'low'; area: string; message: string;
  fix?: { type: string; sections?: string[]; sectionKey?: string } }
interface Report { score: number; grades: { completeness: number; health: number; freshness: number };
  sector: string; findings: Finding[] }

const SEV: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  low: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
};

export default function ShowroomDoctorPanel({ showroomId }: { showroomId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setOpen((v) => !v);
    if (report || loading) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/showrooms/${showroomId}/doctor`, { credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      setReport(await res.json());
    } catch (e) {
      setError((e as Error).message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const hasSectionFix = report?.findings.some((f) => f.fix?.type === 'add_sections');

  return (
    <div className="w-full">
      <button onClick={run}
        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 inline-flex items-center gap-1.5">
        <Stethoscope className="w-3.5 h-3.5" /> {open ? 'Hide' : 'Health'}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border/50 bg-card p-3 space-y-3">
          {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing showroom…</div>}
          {error && <p className="text-xs text-red-500">{error}</p>}

          {report && (
            <>
              <div className="flex items-center gap-4">
                <div className="text-center shrink-0">
                  <p className={`text-2xl font-bold font-mono ${report.score >= 80 ? 'text-emerald-500' : report.score >= 55 ? 'text-amber-500' : 'text-red-500'}`}>
                    {report.score}
                  </p>
                  <p className="text-[9px] uppercase text-muted-foreground">score</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {(['completeness', 'health', 'freshness'] as const).map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[10px] w-20 capitalize text-muted-foreground">{k}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${report.grades[k] >= 80 ? 'bg-emerald-500' : report.grades[k] >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${report.grades[k]}%` }} />
                      </div>
                      <span className="text-[10px] font-mono w-8 text-right">{report.grades[k]}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-secondary/60 shrink-0">{report.sector}</span>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {report.findings.length === 0 && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> No issues found — excellent showroom!</p>
                )}
                {report.findings.map((f) => (
                  <div key={f.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${SEV[f.severity]}`}>
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="flex-1">{f.message}</span>
                    {f.fix?.type === 'add_sections' && (
                      <a href={`/showroom/create?edit=${showroomId}`}
                        className="shrink-0 inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                        Fix <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {hasSectionFix && (
                <a href={`/showroom/create?edit=${showroomId}`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in builder to apply fixes
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
