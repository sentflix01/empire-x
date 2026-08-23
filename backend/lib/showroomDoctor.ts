/**
 * lib/showroomDoctor.ts — Showroom Doctor (Phase 1: deterministic engine)
 *
 * Sector-aware diagnosis of a showroom: completeness, content health,
 * external-source health, freshness. Pure diagnose() is unit-tested; runDoctor()
 * gathers live inputs from the DB. LLM narrative is a later layer — the facts
 * here are the source of truth.
 */
import type { Pool } from 'pg';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Finding {
  id: string;
  severity: Severity;
  area: 'completeness' | 'content' | 'health' | 'freshness' | 'publishing';
  message: string;
  fix?: { type: 'add_sections'; sections: string[] } | { type: 'recheck_source'; sectionKey: string };
}

export interface DoctorInput {
  showroom: {
    id: string; title?: string | null; category?: string | null;
    status?: string | null; cover_image?: string | null; logo_url?: string | null;
    updated_at?: string | Date | null; view_count?: number | null;
  };
  activeSections: string[];
  formData: Record<string, unknown>;
  sourceStats: Array<{ section_key: string; attempts: number; failures: number; last_error: string | null }>;
  productCount: number;
}

export interface DoctorReport {
  score: number;
  grades: { completeness: number; health: number; freshness: number };
  sector: string;
  findings: Finding[];
}

// Sector expectations — extend as sectors onboard. Unknown categories fall
// back to BASELINE so the doctor works for every showroom on day one.
const BASELINE = {
  required: ['contact'] as string[],
  recommended: ['about'] as string[],
};
const SECTOR_EXPECTATIONS: Record<string, { required: string[]; recommended: string[] }> = {
  restaurant: { required: ['menu', 'contact', 'location'], recommended: ['about', 'testimonials', 'gallery'] },
  cafe:       { required: ['menu', 'contact'],             recommended: ['gallery', 'about', 'testimonials'] },
  clinic:     { required: ['services', 'contact', 'about'],recommended: ['testimonials', 'team', 'faq'] },
  hotel:      { required: ['rooms', 'contact', 'location'],recommended: ['gallery', 'testimonials', 'amenities'] },
  gym:        { required: ['services', 'contact'],         recommended: ['pricing', 'testimonials', 'schedule'] },
  salon:      { required: ['services', 'contact'],         recommended: ['gallery', 'pricing', 'testimonials'] },
  boutique:   { required: ['products', 'contact'],         recommended: ['gallery', 'about', 'testimonials'] },
  grocery:    { required: ['products', 'contact', 'location'], recommended: ['about', 'delivery'] },
  realestate: { required: ['listings', 'contact'],         recommended: ['gallery', 'about', 'faq'] },
  education:  { required: ['courses', 'contact'],          recommended: ['about', 'testimonials', 'faq'] },
};

const CONTACT_KEYS = ['phone', 'whatsapp', 'email', 'telegram', 'contact_phone', 'contact_email'];
const ABOUT_KEYS = ['about', 'description', 'about_text', 'bio', 'story'];

function hasValue(formData: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((k) => {
    const v = formData[k];
    if (v === null || v === undefined) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
    return true;
  });
}

export function diagnose(input: DoctorInput): DoctorReport {
  const { showroom, activeSections, formData, sourceStats, productCount } = input;
  const sector = (showroom.category ?? '').toLowerCase().trim();
  const expectations = SECTOR_EXPECTATIONS[sector] ?? BASELINE;
  const sections = new Set(activeSections.map((s) => s.toLowerCase()));
  const findings: Finding[] = [];

  // ── Publishing ──────────────────────────────────────────────────────────────
  if (showroom.status !== 'published') {
    findings.push({ id: 'draft_unpublished', severity: 'high', area: 'publishing',
      message: 'This showroom is not published — visitors cannot see it. Publish it when ready.' });
  }

  // ── Completeness: sections vs sector expectations ───────────────────────────
  for (const s of expectations.required) {
    if (!sections.has(s)) {
      findings.push({ id: `missing_${s}`, severity: s === expectations.required[0] ? 'critical' : 'high',
        area: 'completeness',
        message: `Missing "${s}" section — expected for ${sector || 'every'} showroom(s).`,
        fix: { type: 'add_sections', sections: [s] } });
    }
  }
  for (const s of expectations.recommended) {
    if (!sections.has(s)) {
      findings.push({ id: `recommended_${s}`, severity: 'medium', area: 'completeness',
        message: `Recommended "${s}" section is absent — top ${sector || 'similar'} showrooms include it.`,
        fix: { type: 'add_sections', sections: [s] } });
    }
  }

  // ── Content: contact / about / branding ─────────────────────────────────────
  if (!hasValue(formData, CONTACT_KEYS)) {
    findings.push({ id: 'no_contact', severity: 'critical', area: 'content',
      message: 'No contact channel (phone / WhatsApp / email) — visitors cannot reach you.' });
  }
  if (!hasValue(formData, ABOUT_KEYS)) {
    findings.push({ id: 'no_about', severity: 'medium', area: 'content',
      message: 'No about/description text — tell visitors what makes you different.' });
  }
  if (!showroom.cover_image && !showroom.logo_url) {
    findings.push({ id: 'no_branding', severity: 'medium', area: 'content',
      message: 'No cover image or logo — showrooms with branding get noticeably more engagement.' });
  }

  // ── Catalog (commerce signal) ───────────────────────────────────────────────
  if (productCount === 0) {
    findings.push({ id: 'no_products', severity: 'medium', area: 'completeness',
      message: 'No products linked yet — a small catalog builds trust and enables orders.' });
  } else if (productCount < 3) {
    findings.push({ id: 'low_products', severity: 'low', area: 'completeness',
      message: `Only ${productCount} product(s) — aim for at least 3 to look established.` });
  }

  // ── External source health (Patent 4 surface) ───────────────────────────────
  let healthGrade = 100;
  for (const st of sourceStats) {
    const ratio = st.attempts > 0 ? 1 - st.failures / st.attempts : 1;
    healthGrade = Math.min(healthGrade, Math.round(ratio * 100));
    if (st.attempts >= 3 && ratio < 0.7) {
      findings.push({ id: `source_unhealthy_${st.section_key}`, severity: ratio < 0.4 ? 'critical' : 'high',
        area: 'health',
        message: `External source for "${st.section_key}" failing ${Math.round((1 - ratio) * 100)}% of fetches${st.last_error ? ` — last error: ${st.last_error.slice(0, 80)}` : ''}.`,
        fix: { type: 'recheck_source', sectionKey: st.section_key } });
    }
  }

  // ── Freshness ───────────────────────────────────────────────────────────────
  let freshness = 100;
  if (showroom.updated_at) {
    const days = (Date.now() - new Date(showroom.updated_at).getTime()) / 86_400_000;
    freshness = Math.max(0, 100 - Math.floor(days / 2));
    if (days > 90) {
      findings.push({ id: 'stale_content', severity: 'low', area: 'freshness',
        message: `Not updated in ${Math.floor(days)} days — fresh content keeps visitors coming back.` });
    }
  }

  // ── Scoring ─────────────────────────────────────────────────────────────────
  const weight: Record<Severity, number> = { critical: 22, high: 12, medium: 6, low: 2 };
  const deduction = findings.reduce((sum, f) => sum + weight[f.severity], 0);
  const completeness = Math.max(0, 100 - findings.filter(f => f.area === 'completeness' || f.area === 'content' || f.area === 'publishing').reduce((s, f) => s + weight[f.severity], 0));
  const score = Math.max(0, Math.min(100, 100 - deduction + Math.round((healthGrade + freshness) / 20))); // small bonus for healthy/fresh

  return {
    score,
    grades: { completeness, health: healthGrade, freshness },
    sector: sector || 'general',
    findings: findings.sort((a, b) => {
      const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    }),
  };
}

// ── Live runner: gather inputs from DB, then diagnose ────────────────────────
export async function runDoctor(pool: Pool, showroomId: string): Promise<{ report: DoctorReport; showroom: Record<string, unknown> } | null> {
  const { rows } = await pool.query('SELECT * FROM showrooms WHERE id=$1', [showroomId]);
  if (!rows.length) return null;
  const showroom = rows[0] as Record<string, unknown>;

  let activeSections: string[] = [];
  let formData: Record<string, unknown> = {};
  const rawSections = showroom.sections;
  if (typeof rawSections === 'string') {
    try { const p = JSON.parse(rawSections); return runDoctorParsed(pool, showroom, p); } catch { /* keep defaults */ }
  } else if (rawSections && typeof rawSections === 'object') {
    return runDoctorParsed(pool, showroom, rawSections);
  }
  return { report: diagnose({ showroom: normalize(showroom), activeSections, formData, sourceStats: await sourceStats(pool, showroomId), productCount: await products(pool, showroom) }), showroom };
}

async function runDoctorParsed(pool: Pool, showroom: Record<string, unknown>, parsed: unknown) {
  let activeSections: string[] = [];
  let formData: Record<string, unknown> = {};
  if (Array.isArray(parsed)) activeSections = parsed.map(String);
  else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.sections)) activeSections = (obj.sections as unknown[]).map(String);
    else activeSections = Object.keys(obj);
    formData = obj;
  }
  const report = diagnose({
    showroom: normalize(showroom), activeSections, formData,
    sourceStats: await sourceStats(pool, String(showroom.id)),
    productCount: await products(pool, showroom),
  });
  return { report, showroom };
}

function normalize(showroom: Record<string, unknown>) {
  return {
    id: String(showroom.id), title: showroom.title as string | null, category: showroom.category as string | null,
    status: showroom.status as string | null, cover_image: showroom.cover_image as string | null,
    logo_url: showroom.logo_url as string | null, updated_at: showroom.updated_at as string | null,
    view_count: Number(showroom.view_count ?? 0),
  };
}

async function sourceStats(pool: Pool, showroomId: string) {
  const { rows } = await pool.query(
    `SELECT eds.section_key,
            COUNT(*)::int AS attempts,
            COUNT(*) FILTER (WHERE ehr.success = false)::int AS failures,
            (ARRAY_AGG(ehr.error_msg) FILTER (WHERE ehr.success = false))[1] AS last_error
     FROM external_health_records ehr
     JOIN external_data_sources eds ON eds.id = ehr.source_id
     WHERE eds.showroom_id = $1 AND ehr.fetched_at > NOW() - INTERVAL '30 days'
     GROUP BY eds.section_key`, [showroomId]);
  return rows as Array<{ section_key: string; attempts: number; failures: number; last_error: string | null }>;
}

async function products(pool: Pool, showroom: Record<string, unknown>) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM products WHERE seller_id=$1 AND status='active'`, [showroom.owner_id]);
  return rows[0]?.n ?? 0;
}
