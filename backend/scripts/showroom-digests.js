/**
 * scripts/showroom-digests.js — Weekly Showroom Doctor digests for owners.
 *
 * For every published showroom with an owner email: run the Doctor, skip if
 * nothing changed since the last digest, and email a compact health report
 * (score, grades, top findings, deep-link into the builder).
 *
 * Schedule: checked hourly, sent at most once per showroom per 7 days
 * (throttle tracked via telemetry_events type='showroom_digest_sent').
 * Production-only unless DIGEST_SCHEDULE_ENABLED=true. Manual: npm run digests.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const logger = require('../lib/logger');
const pool = require('../db/pool');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_RUN = 200; // safety cap per hourly tick

function isNeonQuotaError(err) {
  if (!err) return false;
  const message = String(err.message ?? err).toLowerCase();
  const detail = String(err.detail ?? '').toLowerCase();
  const code = String(err.code ?? '').toLowerCase();
  return (
    message.includes('compute time quota') ||
    message.includes('account or project has exceeded') ||
    detail.includes('compute time quota') ||
    (code.includes('57014') && message.includes('quota')) ||
    (message.includes('quota') && message.includes('neon'))
  );
}

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────
function isDue(lastSentAt, now = Date.now()) {
  if (!lastSentAt) return true;
  return now - new Date(lastSentAt).getTime() >= WEEK_MS;
}

function buildDigestHtml(report, showroomTitle, builderUrl) {
  const sevColor = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#0284c7' };
  const bar = (label, v) => `
    <tr><td style="padding:2px 8px 2px 0;font-size:12px;color:#71717a;width:90px;">${label}</td>
    <td style="flex:1"><div style="background:#e4e4e7;border-radius:99px;height:8px;width:160px;display:inline-block;vertical-align:middle;">
    <div style="background:${v >= 80 ? '#10b981' : v >= 50 ? '#f59e0b' : '#dc2626'};height:8px;border-radius:99px;width:${v}%;"></div>
    </div> <b style="font-size:12px;">${v}</b></td></tr>`;
  const findings = report.findings.slice(0, 5).map((f) =>
    `<li style="margin:4px 0;color:${sevColor[f.severity]};"><b>${f.severity.toUpperCase()}</b> — <span style="color:#18181b;">${f.message}</span></li>`).join('');
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(90deg,#f59e0b,#d97706);padding:14px 20px;">
      <h2 style="color:#fff;margin:0;font-size:16px;">🩺 Showroom Health Report</h2>
      <p style="color:#fffbeb;margin:2px 0 0;font-size:12px;">${showroomTitle} · sector: ${report.sector}</p>
    </div>
    <div style="padding:18px 20px;">
      <p style="margin:0 0 10px;font-size:30px;font-weight:700;color:${report.score >= 80 ? '#10b981' : report.score >= 55 ? '#f59e0b' : '#dc2626'};">
        ${report.score}<span style="font-size:14px;color:#71717a;">/100</span></p>
      <table cellpadding="0" cellspacing="0">
        ${bar('Completeness', report.grades.completeness)}
        ${bar('Health', report.grades.health)}
        ${bar('Freshness', report.grades.freshness)}
      </table>
      ${report.findings.length ? `<h3 style="font-size:13px;margin:16px 0 4px;">Top priorities</h3><ul style="padding-left:18px;margin:0;font-size:12px;">${findings}</ul>` :
        '<p style="color:#10b981;font-size:12px;">✓ No issues found — excellent showroom!</p>'}
      <a href="${builderUrl}" style="display:inline-block;margin-top:14px;background:#f59e0b;color:#fff;text-decoration:none;
         padding:9px 18px;border-radius:10px;font-size:13px;font-weight:600;">Improve in the builder →</a>
      <p style="color:#a1a1aa;font-size:10px;margin-top:14px;">Weekly report from Nodbusiness Showroom Doctor.</p>
    </div>
  </div>`;
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function runDigests() {
  let showrooms;
  try {
    const result = await pool.query(
      `SELECT s.id, s.title, s.updated_at, u.email
       FROM showrooms s JOIN users u ON u.id = s.owner_id
       WHERE s.status = 'published' AND u.email IS NOT NULL
       ORDER BY s.updated_at DESC LIMIT $1`, [MAX_PER_RUN]);
    showrooms = result.rows;
  } catch (err) {
    if (isNeonQuotaError(err)) {
      logger.warn({ err: err.message }, 'digest: skipped (Neon compute quota exhausted)');
      return { sent: 0, skipped: 0, quotaExceeded: true };
    }
    throw err;
  }

  const { runDoctor } = await import('../lib/showroomDoctor');
  const { sendCustomEmail } = await import('../utils/mailer');
  const { recordEvent } = await import('../lib/telemetry');

  let sent = 0; let skipped = 0;
  for (const sh of showrooms) {
    try {
      // Weekly throttle per showroom (last successful digest)
      const last = await pool.query(
        `SELECT created_at FROM telemetry_events
         WHERE type='showroom_digest_sent' AND payload->>'showroomId'=$1
         ORDER BY created_at DESC LIMIT 1`, [sh.id]);
      if (!isDue(last.rows[0]?.created_at)) { skipped++; continue; }

      const result = await runDoctor(pool, sh.id);
      if (!result) continue;
      const builderUrl = `${process.env.FRONTEND_URL?.split(',')[0] ?? 'https://nodbusiness.app'}/showroom/create?edit=${sh.id}`;
      const html = buildDigestHtml(result.report, sh.title ?? sh.id, builderUrl);
      await sendCustomEmail(sh.email, `🩺 Your "${sh.title ?? 'showroom'}" weekly health report — ${result.report.score}/100`, html);
      recordEvent('showroom_digest_sent', { showroomId: sh.id, score: result.report.score, email: sh.email });
      sent++;
    } catch (err) {
      if (isNeonQuotaError(err)) {
        logger.warn({ err: err.message, showroomId: sh.id }, 'digest: skipped for showroom (Neon compute quota exhausted)');
        break;
      }
      logger.warn({ err: err.message, showroomId: sh.id }, 'digest: failed for showroom');
    }
  }
  logger.info({ sent, skipped, total: showrooms.length }, 'digest: run complete');
  return { sent, skipped };
}

function startDigestSchedule() {
  const enabled = process.env.NODE_ENV === 'production' || process.env.DIGEST_SCHEDULE_ENABLED === 'true';
  if (!enabled) { logger.info('digest: schedule disabled (non-production)'); return; }
  const tick = async () => {
    try { await runDigests(); }
    catch (err) { logger.warn({ err: err.message }, 'digest: run failed'); }
  };
  // Weekly cadence via hourly ticks + per-showroom 7-day throttle.
  setInterval(tick, 60 * 60 * 1000).unref();
  setTimeout(tick, 10_000).unref();
  logger.info('digest: weekly schedule active');
}

module.exports = { runDigests, startDigestSchedule, isDue, buildDigestHtml, isNeonQuotaError };

if (require.main === module) {
  runDigests().then(() => process.exit(0)).catch(() => process.exit(1));
}
