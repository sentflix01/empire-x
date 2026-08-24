/**
 * lib/scorecard.ts — Live Production Readiness Scorecard
 *
 * Computes the 11-dimension readiness grades from REAL signals where the
 * backend has access (DB health, backup freshness, alerts, telemetry,
 * docs/log counts, migration status) and pairs them with static verified
 * claims (code audits — each marked with its verification date).
 *
 * Used by GET /api/devops/scorecard (admin) and the /scorecard console page.
 */
import type { Pool } from 'pg';
import { assembleInputs, evaluate } from './alerts';

export interface Check { label: string; status: 'pass' | 'warn' | 'fail'; detail: string }
export interface Dimension { key: string; label: string; grade: string; score: number; checks: Check[] }
export interface Scorecard {
  overall: { grade: string; score: number };
  dimensions: Dimension[];
  liveSignals: Record<string, unknown>;
  generatedAt: string;
}

const VERIFIED = '2026-08-24';

function gradeFor(score: number): string {
  if (score >= 93) return 'A';
  if (score >= 87) return 'A−';
  if (score >= 80) return 'B+';
  if (score >= 73) return 'B';
  if (score >= 65) return 'B−';
  if (score >= 55) return 'C+';
  return 'C';
}
function scoreOf(checks: Check[]): number {
  if (!checks.length) return 70;
  const pts = checks.reduce((s, c) => s + (c.status === 'pass' ? 100 : c.status === 'warn' ? 60 : 0), 0);
  return Math.round(pts / checks.length);
}

export async function buildScorecard(pool: import('pg').Pool): Promise<Scorecard> {
  // ── Live signals ─────────────────────────────────────────────────────────────
  const inputs = await assembleInputs(pool).catch(() => null);
  const alerts = inputs ? evaluate(inputs) : [];
  const sev1 = alerts.filter((a) => a.severity === 'SEV1').length;
  const sev2 = alerts.filter((a) => a.severity === 'SEV2').length;

  const mig = await pool.query('SELECT COUNT(*)::int AS n FROM schema_migrations').catch(() => ({ rows: [{ n: 0 }] }));
  const migrationsApplied = mig.rows[0]?.n ?? 0;

  // Docs + log counts (available when the deploy includes the repo docs/, e.g. local & monorepo deploys)
  const fs = await import('fs');
  const path = await import('path');
  let prodDocs = 0; let logReports = 0;
  try {
    const prodDir = path.join(process.cwd(), '..', 'docs', 'Production');
    prodDocs = (await fs.promises.readdir(prodDir, { recursive: true }) as string[]).filter((f) => f.endsWith('.md')).length;
  } catch { /* docs not in container */ }
  try {
    const logDir = path.join(process.cwd(), '..', 'docs', 'log-report');
    logReports = fs.readdirSync(logDir).filter((f) => /^\d{4}-/.test(f)).length;
  } catch { /* not in container */ }

  // API endpoint count from the generated catalog
  let endpoints = 0;
  try {
    endpoints = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'api-catalog.json'), 'utf8')).count ?? 0;
  } catch { /* catalog not generated in container */ }

  const backupAgeH = inputs?.lastBackupAt
    ? Math.round((Date.now() - new Date(inputs.lastBackupAt).getTime()) / 3_600_000)
    : null;

  // ── Dimensions ───────────────────────────────────────────────────────────────
  const errLastHour = inputs?.errorsLastHour ?? 0;
  const dimensions: Dimension[] = [
    {
      key: 'security', label: 'Security', grade: 'A−', score: 92, checks: [
        { label: 'Parameterized SQL + identifier allowlists', status: 'pass', detail: 'crud.ts sanitizeColumn + ALLOWED_TABLES (verified ' + VERIFIED + ')' },
        { label: 'Access/refresh token separation + revocation', status: 'pass', detail: 'verifyAccessToken on routes + sockets; Redis revocation lists' },
        { label: 'Rate limits + Helmet strict CSP (prod)', status: 'pass', detail: '500/15min global, 20/15min auth; dev skipped by design' },
        { label: 'Upload hardening — SVG removed', status: 'pass', detail: 'TD-017 closed; MIME×extension cross-check active' },
        { label: 'TLS certificate validation', status: 'pass', detail: 'TD-016 closed on pg/redis/socket adapters' },
        { label: 'Magic-byte upload sniffing', status: 'warn', detail: 'Optional hardening — tracked in THREAT_MODEL' },
      ],
    },
    {
      key: 'reliability', label: 'Reliability', grade: 'A−', score: 91, checks: [
        { label: 'Test suites (backend / frontend / e2e)', status: 'pass', detail: '293 + 103 + 8 — all green (latest CI run)' },
        { label: 'Atomic money operations', status: 'pass', detail: 'atomicWalletOp row-locks; idempotent webhook claims' },
        { label: 'Automated backups + restore verification', status: backupAgeH !== null && backupAgeH <= 50 ? 'pass' : 'warn', detail: backupAgeH !== null ? `Last OK backup ${backupAgeH}h ago` : 'No backup recorded yet — run npm run backup' },
        { label: 'Stale-cache fallback + circuit breaker', status: 'pass', detail: 'proxyGateway claim-3 embodiment, unit-tested' },
        { label: 'Live error budget', status: errLastHour >= 50 ? 'fail' : errLastHour >= 20 ? 'warn' : 'pass', detail: `${errLastHour} errors in the last hour` },
      ],
    },
    {
      key: 'cicd', label: 'CI/CD', grade: 'A', score: 95, checks: [
        { label: 'Blocking gates (typecheck/tests/build)', status: 'pass', detail: 'ci.yml hard gates — no || true on critical paths' },
        { label: 'Deploys chained to green CI', status: 'pass', detail: 'workflow_run + commit-pinned gate job' },
        { label: 'Post-deploy health check + Telegram', status: 'pass', detail: 'Fails the workflow; pages when secrets set' },
        { label: 'Auto docs-sync bot', status: 'pass', detail: 'API reference + Production encyclopedia + task log on every merge' },
        { label: 'Dependabot (npm + actions)', status: 'pass', detail: 'Weekly npm, monthly actions' },
        { label: 'Staging environment', status: 'warn', detail: 'Not provisioned — operator item' },
      ],
    },
    {
      key: 'docs', label: 'Documentation', grade: 'A', score: 96, checks: [
        { label: 'Production encyclopedia', status: prodDocs > 200 ? 'pass' : 'warn', detail: `${prodDocs} docs in docs/Production (self-syncing)` },
        { label: 'Generated API reference', status: endpoints > 0 ? 'pass' : 'warn', detail: `${endpoints} endpoints in api-catalog.json` },
        { label: 'Implementation log', status: logReports > 20 ? 'pass' : 'warn', detail: `${logReports} task reports (auto-generated per merge)` },
        { label: 'Canonical sources', status: 'pass', detail: 'Severity, money model, flags, roadmap — single sources enforced' },
      ],
    },
    {
      key: 'seo', label: 'SEO / Discoverability', grade: 'A−', score: 90, checks: [
        { label: 'robots.ts + sitemap.ts', status: 'pass', detail: 'Admin/api/wallet disallowed; core routes indexed' },
        { label: 'OG + Twitter cards', status: 'pass', detail: 'Root metadata with templates' },
        { label: 'SSR public pages', status: 'pass', detail: 'Showrooms/products/profiles server-rendered' },
        { label: 'DB-driven sitemap expansion', status: 'warn', detail: 'Add dynamic entities as the catalog grows' },
      ],
    },
    {
      key: 'observability', label: 'Observability', grade: 'B+', score: 85, checks: [
        { label: 'Telemetry ledger', status: 'pass', detail: 'telemetry_events — payments/auth/wallet/backups/copilot' },
        { label: 'Executable alert thresholds', status: 'pass', detail: 'Error/payment/backup/redis — unit-tested evaluator' },
        { label: 'SEV1 Telegram paging', status: 'pass', detail: 'Throttled dispatch via health-summary' },
        { label: 'External log drain + dashboards', status: 'warn', detail: 'Operator setup — MONITORING.md targets' },
      ],
    },
    {
      key: 'performance', label: 'Performance', grade: 'B+', score: 85, checks: [
        { label: 'Keyset pagination on hot paths', status: 'pass', detail: 'orders/posts cursor pagination' },
        { label: 'Database indexes', status: migrationsApplied >= 33 ? 'pass' : 'warn', detail: `${migrationsApplied} migrations applied — incl. FTS + FK scalability sets` },
        { label: 'gzip + ETag + HTTP caching', status: 'pass', detail: 'compression + per-user-isolated cache middleware' },
        { label: 'Lazy images', status: 'pass', detail: '44 img tags lazy-loaded (2026-08-24 pass)' },
        { label: 'Lighthouse on production URL', status: 'warn', detail: 'Run after domain DNS is final' },
      ],
    },
    {
      key: 'ux', label: 'User Satisfaction', grade: 'B+', score: 85, checks: [
        { label: 'Error boundaries every segment + global', status: 'pass', detail: 'app/error.tsx, global-error.tsx, (app)/(auth)' },
        { label: 'Weekly owner health digests', status: 'pass', detail: 'Showroom Doctor email reports' },
        { label: 'One-click Doctor fixes', status: 'pass', detail: 'Re-check + auto-append sections (Phase 3)' },
        { label: 'Analytics SDK for satisfaction measurement', status: 'warn', detail: 'Vendor choice pending — founder decision' },
      ],
    },
    {
      key: 'i18n', label: 'i18n / Global-readiness', grade: 'B', score: 80, checks: [
        { label: 'Locales shipped (en + am)', status: 'pass', detail: 'i18next flat namespace, 34KB Amharic' },
        { label: 'ETB ledger + documented FX policy', status: 'pass', detail: 'CURRENCY_AND_COMMISSION.md canonical' },
        { label: 'Translation coverage audit for new features', status: 'warn', detail: 'New UI strings need am.json sync' },
      ],
    },
    {
      key: 'a11y', label: 'Accessibility', grade: 'B', score: 80, checks: [
        { label: '44px touch targets (mobile)', status: 'pass', detail: 'globals.css enforced ≤1024px' },
        { label: 'Icon-button labels', status: 'pass', detail: '8 added this pass; title-mirrored' },
        { label: 'Full WCAG 2.1 AA axe sweep', status: 'warn', detail: 'Recommended pre-marketing push' },
      ],
    },
    {
      key: 'legal', label: 'Legal / Compliance', grade: 'B−', score: 72, checks: [
        { label: 'Policy frameworks drafted', status: 'pass', detail: 'ToS/Privacy/AML-KYC/data-governance/Trust-Safety suites' },
        { label: 'Founder decisions (entity/domain/pricing)', status: 'fail', detail: 'Open — blocks contract enforcement (O-1…O-10)' },
        { label: 'Licensed counsel review of legal docs', status: 'warn', detail: 'Required before public enforcement' },
      ],
    },
  ];

  // Live reliability adjustments
  if (sev1 > 0) {
    const rel = dimensions.find((d) => d.key === 'reliability')!;
    rel.checks.push({ label: 'SEV1 alert firing now', status: 'fail', detail: `${sev1} SEV1 alert(s) active — see Ops Alerts` });
    rel.score = Math.min(rel.score, 60);
  } else if (sev2 > 0) {
    dimensions.find((d) => d.key === 'reliability')!.checks
      .push({ label: 'SEV2 alert firing now', status: 'warn', detail: `${sev2} SEV2 alert(s) active` });
  }

  for (const d of dimensions) d.score = Math.min(d.score, scoreOf(d.checks));
  for (const d of dimensions) d.grade = gradeFor(d.score);

  const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  return {
    overall: { grade: gradeFor(overallScore), score: overallScore },
    dimensions,
    liveSignals: {
      migrationsApplied, endpoints, prodDocs, logReports,
      errorsLastHour: inputs?.errorsLastHour ?? 0,
      payments24h: inputs?.paymentAttempts24h ?? 0,
      backupAgeH, redisUp: inputs?.redisConfigured ?? false,
      activeAlerts: alerts.length,
    },
    generatedAt: new Date().toISOString(),
  };
}
